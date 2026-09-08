import {
  json,
  withErrorHandling,
  requireAdmin,
  ensureAnalyticsTables,
  ensureSecurityTables
} from "../_utils.js";

export async function onRequestGet(context) {
  return withErrorHandling(context, async () => {
    const { user, response } = await requireAdmin(context);
    if (response) return response;

    await ensureAnalyticsTables(context.env);
    await ensureSecurityTables(context.env);

    const nowIso = new Date().toISOString();

    const [
      totalUsersRow,
      usersTodayRow,
      usersMonthRow,
      totalDealsRow,
      dealsTodayRow,
      dealsMonthRow,
      totalLoginsRow,
      failedLoginsRow,
      activeSessionsRow,
      activeLockoutsRow,
      totalViewsRow,
      viewsTodayRow,
      viewsMonthRow,
      uniqueVisitorsRow,
      uniqueVisitorsMonthRow,
      importsRow,
      leaderboardResult,
      recentUsersResult,
      topPagesResult,
      trafficResult,
      recentActivityResult
    ] = await Promise.all([
      context.env.DB.prepare(`SELECT COUNT(*) AS count FROM users`).first(),
      context.env.DB.prepare(`SELECT COUNT(*) AS count FROM users WHERE created_at >= date('now')`).first(),
      context.env.DB.prepare(`SELECT COUNT(*) AS count FROM users WHERE created_at >= date('now', 'start of month')`).first(),
      context.env.DB.prepare(`SELECT COUNT(*) AS count FROM deals`).first(),
      context.env.DB.prepare(`SELECT COUNT(*) AS count FROM deals WHERE created_at >= date('now')`).first(),
      context.env.DB.prepare(`SELECT COUNT(*) AS count FROM deals WHERE created_at >= date('now', 'start of month')`).first(),
      context.env.DB.prepare(`SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = 'successful_login'`).first(),
      context.env.DB.prepare(`SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = 'failed_login'`).first(),
      context.env.DB.prepare(`SELECT COUNT(*) AS count FROM sessions WHERE expires_at > ?`).bind(nowIso).first(),
      context.env.DB.prepare(`SELECT COUNT(*) AS count FROM account_lockouts WHERE locked_until > ?`).bind(nowIso).first(),
      context.env.DB.prepare(`SELECT COUNT(*) AS count FROM page_views`).first(),
      context.env.DB.prepare(`SELECT COUNT(*) AS count FROM page_views WHERE created_at >= date('now')`).first(),
      context.env.DB.prepare(`SELECT COUNT(*) AS count FROM page_views WHERE created_at >= date('now', 'start of month')`).first(),
      context.env.DB.prepare(`SELECT COUNT(DISTINCT visitor_id) AS count FROM page_views`).first(),
      context.env.DB.prepare(`SELECT COUNT(DISTINCT visitor_id) AS count FROM page_views WHERE created_at >= date('now', 'start of month')`).first(),
      context.env.DB.prepare(`SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = 'import_completed'`).first(),
      context.env.DB.prepare(
        `SELECT
           u.id,
           u.email,
           COALESCE(u.name, '') AS name,
           u.created_at,
           COUNT(d.id) AS deal_count,
           MAX(d.created_at) AS last_deal_at,
           (
             SELECT MAX(ae.created_at)
             FROM analytics_events ae
             WHERE ae.user_id = u.id AND ae.event_type = 'successful_login'
           ) AS last_login_at
         FROM users u
         LEFT JOIN deals d ON d.user_id = u.id
         GROUP BY u.id, u.email, u.name, u.created_at
         ORDER BY deal_count DESC, u.created_at ASC
         LIMIT 50`
      ).all(),
      context.env.DB.prepare(
        `SELECT id, email, COALESCE(name, '') AS name, created_at
         FROM users
         ORDER BY created_at DESC
         LIMIT 12`
      ).all(),
      context.env.DB.prepare(
        `SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
         FROM page_views
         GROUP BY path
         ORDER BY views DESC
         LIMIT 10`
      ).all(),
      context.env.DB.prepare(
        `SELECT date(created_at) AS day,
                COUNT(*) AS views,
                COUNT(DISTINCT visitor_id) AS visitors
         FROM page_views
         WHERE created_at >= date('now', '-13 days')
         GROUP BY date(created_at)
         ORDER BY day ASC`
      ).all(),
      context.env.DB.prepare(
        `SELECT ae.event_type, ae.created_at, ae.details,
                COALESCE(u.email, '') AS email,
                COALESCE(u.name, '') AS name
         FROM analytics_events ae
         LEFT JOIN users u ON u.id = ae.user_id
         ORDER BY ae.created_at DESC
         LIMIT 30`
      ).all()
    ]);

    const n = (row) => Number(row?.count || 0);
    const totalUsers = n(totalUsersRow);
    const totalDeals = n(totalDealsRow);

    return json({
      admin: { email: user.email },
      overview: {
        totalUsers,
        usersToday: n(usersTodayRow),
        usersThisMonth: n(usersMonthRow),
        totalDeals,
        dealsToday: n(dealsTodayRow),
        dealsThisMonth: n(dealsMonthRow),
        averageDealsPerUser: totalUsers ? Number((totalDeals / totalUsers).toFixed(1)) : 0,
        successfulLogins: n(totalLoginsRow),
        failedLogins: n(failedLoginsRow),
        activeSessions: n(activeSessionsRow),
        activeLockouts: n(activeLockoutsRow),
        totalPageViews: n(totalViewsRow),
        viewsToday: n(viewsTodayRow),
        viewsThisMonth: n(viewsMonthRow),
        uniqueVisitors: n(uniqueVisitorsRow),
        uniqueVisitorsThisMonth: n(uniqueVisitorsMonthRow),
        importsCompleted: n(importsRow)
      },
      leaderboard: leaderboardResult.results || [],
      recentUsers: recentUsersResult.results || [],
      topPages: topPagesResult.results || [],
      traffic: trafficResult.results || [],
      recentActivity: recentActivityResult.results || [],
      notes: {
        analyticsStart: "Login, event, and page-view analytics begin accumulating after this admin update is deployed. User and deal totals include existing database records."
      }
    });
  });
}
