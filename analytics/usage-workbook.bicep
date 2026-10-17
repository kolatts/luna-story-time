// Luna's Story Time — usage workbook
// Reads the custom events js/track.js sends to Application Insights and compares
// the latest window (default 14 days) with the window before it, so the question
// "is it getting better?" is answered at a glance.
//
// Deploy (Imagile Paid, resource group imagile-organization):
//   az deployment group create --subscription "Imagile Paid" \
//     -g imagile-organization -f analytics/usage-workbook.bicep
// Cost: workbooks are free; queries run against data already retained 90 days.

@description('Application Insights component the site reports to')
param appInsightsName string = 'luna-storytime-ai'

param location string = resourceGroup().location

resource appInsights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: appInsightsName
}

// Shared prefix: live-site events from the current window ("now") and the one before it.
var base = '''
let w = {Window};
let ev = customEvents
| where timestamp > ago(2 * w)
| where tostring(customDimensions["env"]) == "{Env}"
| extend period = iff(timestamp > ago(w), "now", "before"),
         book = tostring(customDimensions["book"]),
         bookTitle = tostring(customDimensions["title"]),
         game = tostring(customDimensions["game"]),
         reading = strcat(session_Id, "|", tostring(customDimensions["book"]));
'''

#disable-next-line prefer-interpolation // multi-line ''' strings can't interpolate
var kpiQuery = concat(base, '''
ev
| summarize
    Visits = dcount(session_Id),
    Started = dcountif(reading, name == "story_open"),
    Finished = dcountif(reading, name == "story_finish"),
    Plays = dcountif(session_Id, name == "game_play"),
    Touched = dcountif(session_Id, name == "suggest_focus"),
    Sent = countif(name == "suggest_submit")
  by period
| extend Rate = iff(Started > 0, round(100.0 * Finished / Started, 0), 0.0)
| project period, kv = bag_pack(
    "1Visits", Visits, "2Stories started", Started, "3Read all the way", Finished,
    "4Finish rate %", Rate, "5Game plays", Plays, "6Clicked into the idea form", Touched,
    "7Ideas sent", Sent)
| mv-expand kv
| extend Metric = tostring(bag_keys(kv)[0])
| extend Value = todouble(kv[Metric])
| summarize Now = sumif(Value, period == "now"), Before = sumif(Value, period == "before") by Metric
| extend pct = Metric has "%"
| extend Trend = case(
    Now == Before, "— same as before",
    Before == 0, "▲ new",
    pct, strcat(iff(Now > Before, "▲ ", "▼ "), tostring(toint(abs(Now - Before))), " pts"),
    strcat(iff(Now > Before, "▲ ", "▼ "), tostring(round(100.0 * abs(Now - Before) / Before, 0)), "%"))
| extend Trend = strcat(Trend, " · was ", tostring(toint(Before)), iff(pct, "%", ""))
| extend Value = strcat(tostring(toint(Now)), iff(pct, "%", ""))
| order by Metric asc
| project Metric = substring(Metric, 1), Value, Trend
''')

#disable-next-line prefer-interpolation // multi-line ''' strings can't interpolate
var dailyQuery = concat(base, '''
ev
| where period == "now"
| make-series
    Visits = dcount(session_Id),
    ['Stories started'] = dcountif(reading, name == "story_open"),
    ['Read all the way'] = dcountif(reading, name == "story_finish"),
    ['Game plays'] = dcountif(session_Id, name == "game_play")
  default = 0 on timestamp from startofday(ago(w)) to now() step 1d
''')

// Day N of this window vs day N of the window before. __FILTER__ / __KEY__ pick the metric.
#disable-next-line prefer-interpolation // multi-line ''' strings can't interpolate
var compareTemplate = concat(base, '''
let days = toint(w / 1d);
let windowStart = now() - 2 * w;
range Day from 1 to days step 1
| join kind=leftouter (
    ev
    | where __FILTER__
    | extend Day = toint((timestamp - windowStart) / 1d) % days + 1
    | summarize ['This window'] = dcountif(__KEY__, period == "now"),
                ['Window before'] = dcountif(__KEY__, period == "before") by Day
  ) on Day
| project Day, ['This window'] = coalesce(['This window'], 0), ['Window before'] = coalesce(['Window before'], 0)
| order by Day asc
''')
var compareVisitsQuery = replace(replace(compareTemplate, '__FILTER__', 'true'), '__KEY__', 'session_Id')
var compareFinishedQuery = replace(replace(compareTemplate, '__FILTER__', 'name == "story_finish"'), '__KEY__', 'reading')

#disable-next-line prefer-interpolation // multi-line ''' strings can't interpolate
var storiesQuery = concat(base, '''
let stops = ev
| where period == "now" and name in ("story_open", "story_page", "story_finish")
| extend reached = toint(coalesce(tostring(customDimensions["spread"]), tostring(customDimensions["resumedAt"]))),
         total = toint(customDimensions["pages"])
| summarize far = max(reached), total = max(total), done = countif(name == "story_finish") by reading, book
| where done == 0
| summarize stopAt = percentile(far, 50), total = max(total) by book;
ev
| where name in ("story_open", "story_finish")
| summarize
    Title = take_anyif(bookTitle, isnotempty(bookTitle)),
    Readers = dcountif(reading, name == "story_open" and period == "now"),
    Finished = dcountif(reading, name == "story_finish" and period == "now"),
    ReadersBefore = dcountif(reading, name == "story_open" and period == "before"),
    FinishedBefore = dcountif(reading, name == "story_finish" and period == "before")
  by book
| join kind=leftouter stops on book
| extend Rate = iff(Readers > 0, round(100.0 * Finished / Readers, 0), real(null)),
         RateBefore = iff(ReadersBefore > 0, round(100.0 * FinishedBefore / ReadersBefore, 0), real(null))
| extend Trend = case(Readers > ReadersBefore, "▲", Readers < ReadersBefore, "▼", "—")
| project
    Story = coalesce(Title, book),
    Readers,
    ['Read all the way'] = Finished,
    ['Finish rate %'] = Rate,
    ['Quitters usually stop'] = iff(isnull(stopAt), "", strcat("page ", tostring(toint(stopAt)), " of ", tostring(total))),
    ['Readers before'] = ReadersBefore,
    ['Finish rate before %'] = RateBefore,
    Trend
| order by Readers desc
''')

#disable-next-line prefer-interpolation // multi-line ''' strings can't interpolate
var gamesQuery = concat(base, '''
ev
| where name in ("game_open", "game_play")
| summarize
    Opened = dcountif(session_Id, name == "game_open" and period == "now"),
    Played = dcountif(session_Id, name == "game_play" and period == "now"),
    PlayedBefore = dcountif(session_Id, name == "game_play" and period == "before")
  by game
| extend Trend = case(Played > PlayedBefore, "▲", Played < PlayedBefore, "▼", "—")
| project
    Game = case(game == "castle-life", "🏰 Castle Life",
                game == "present-peek", "🎁 The Great Present Peek",
                game == "birthday-party-patrol", "🎂 The Birthday Party Patrol", game),
    Opened, Played, ['Played before'] = PlayedBefore, Trend
| order by Played desc
''')

#disable-next-line prefer-interpolation // multi-line ''' strings can't interpolate
var formQuery = concat(base, '''
ev
| where name in ("suggest_view", "suggest_focus", "suggest_submit")
| summarize ['This window'] = dcountif(session_Id, period == "now"),
            ['Window before'] = dcountif(session_Id, period == "before") by name
| extend Step = case(name == "suggest_view", "1. Scrolled to the form",
                     name == "suggest_focus", "2. Clicked into it", "3. Sent an idea")
| project Step, ['This window'], ['Window before']
| order by Step asc
''')


func kql(name string, title string, query string, viz string, width string, extra object) object => {
  type: 3
  name: name
  customWidth: width
  content: union({
    version: 'KqlItem/1.0'
    query: query
    title: title
    size: 0
    queryType: 0
    resourceType: 'microsoft.insights/components'
    timeContext: { durationMs: 5184000000 }
    visualization: viz
  }, extra)
}

var bar = { formatter: 4, formatOptions: { palette: 'blue' } }

var workbookContent = {
  version: 'Notebook/1.0'
  items: [
    {
      type: 1
      name: 'intro'
      content: {
        json: '## 🌙 Luna\'s Story Time — how is the site doing?\nEvery number compares the selected window with the same-length window just before it. A **visit** is one browser tab session; a **story read** is one visit opening one book; **read all the way** means reaching the last page of the story.'
      }
    }
    {
      type: 9
      name: 'params'
      content: {
        version: 'KqlParameterItem/1.0'
        style: 'pills'
        queryType: 0
        resourceType: 'microsoft.insights/components'
        parameters: [
          {
            id: 'a4b7e2c1-5d3f-4e8a-9c1b-2f6d8e0a7b35'
            version: 'KqlParameterItem/1.0'
            name: 'Window'
            label: 'Window'
            type: 2
            isRequired: true
            typeSettings: { additionalResourceOptions: [], showDefault: false }
            jsonData: '[{"value":"7d","label":"7 days"},{"value":"14d","label":"14 days","selected":true},{"value":"28d","label":"28 days"}]'
            value: '14d'
          }
          {
            id: 'c3e1f9a2-7b4d-4c6e-8a5f-1d2b3c4e5f60'
            version: 'KqlParameterItem/1.0'
            name: 'Env'
            label: 'Site'
            type: 2
            isRequired: true
            typeSettings: { additionalResourceOptions: [], showDefault: false }
            jsonData: '[{"value":"prod","label":"Live site","selected":true},{"value":"dev","label":"Local tests (?track=1)"}]'
            value: 'prod'
          }
        ]
      }
    }
    kql('kpis', 'This window vs the one before', kpiQuery, 'tiles', '100', {
      size: 4
      tileSettings: {
        showBorder: true
        titleContent: { columnMatch: 'Metric', formatter: 1 }
        leftContent: { columnMatch: 'Value', formatter: 1 }
        secondaryContent: { columnMatch: 'Trend', formatter: 1 }
      }
    })
    kql('daily', 'Day by day (this window)', dailyQuery, 'timechart', '100', {})
    kql('compareVisits', 'Visits: day N of this window vs the window before', compareVisitsQuery, 'linechart', '50', {
      chartSettings: { xAxis: 'Day' }
    })
    kql('compareFinished', 'Stories read all the way: day N vs the window before', compareFinishedQuery, 'linechart', '50', {
      chartSettings: { xAxis: 'Day' }
    })
    kql('stories', 'Stories', storiesQuery, 'table', '100', {
      gridSettings: {
        formatters: [
          union({ columnMatch: '^Readers$' }, bar)
          union({ columnMatch: 'Read all the way' }, bar)
          { columnMatch: 'Finish rate %', formatter: 8, formatOptions: { palette: 'redGreen', min: 0, max: 100 } }
        ]
      }
    })
    kql('games', 'Games', gamesQuery, 'table', '50', {
      gridSettings: {
        formatters: [
          union({ columnMatch: '^Played$' }, bar)
        ]
      }
    })
    kql('form', 'Story idea form', formQuery, 'barchart', '50', {})
  ]
  fallbackResourceIds: [appInsights.id]
  '$schema': 'https://github.com/Microsoft/Application-Insights-Workbooks/blob/master/schema/workbook.json'
}

resource workbook 'Microsoft.Insights/workbooks@2023-06-01' = {
  name: guid(resourceGroup().id, 'luna-story-time-usage')
  location: location
  kind: 'shared'
  tags: {
    Purpose: 'Luna Story Time Monitoring'
  }
  properties: {
    displayName: 'Luna\'s Story Time — Usage'
    category: 'workbook'
    sourceId: appInsights.id
    serializedData: string(workbookContent)
  }
}

output workbookId string = workbook.id
