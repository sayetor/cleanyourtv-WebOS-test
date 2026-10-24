// Network status and AirPlay for the launcher's top buttons.
// GET /api/net      -> { kind: 'wifi' | 'wired' | 'none', ssid, internet, ip }   (the TV's connection manager, summarised)
// GET /api/airplay  -> { id, title } of LG's own AirPlay app, or { id: null } when this TV has none
// Node 8 compatible (webOS 5/6): no ?., no ??.
'use strict';

// the connection manager's answer, reduced to what the button shows; wired wins over Wi-Fi when both are up (the TV uses it)
function summarize(r) {
  r = r || {};
  const on = x => !!x && x.state === 'connected';
  const reach = x => x.onInternet === 'yes' || (x.onInternet === undefined && r.isInternetConnectionAvailable === true);
  if (on(r.wired)) return { kind: 'wired', ssid: '', internet: reach(r.wired), ip: String(r.wired.ipAddress || '') };
  if (on(r.wifi)) return { kind: 'wifi', ssid: String(r.wifi.ssid || '').slice(0, 64), internet: reach(r.wifi), ip: String(r.wifi.ipAddress || '') };
  return { kind: 'none', ssid: '', internet: false, ip: '' };
}

// LG ships AirPlay as a system app on the models that support it; its id differs between webOS versions, so it is found by name
function findAirplay(apps) {
  const a = (apps || []).find(x => x && typeof x.id === 'string' && (/airplay/i.test(x.id) || /airplay/i.test(String(x.title || ''))));
  return a ? { id: a.id, title: String(a.title || 'AirPlay') } : { id: null };
}

function create(luna) {
  let net = null, netAt = 0, air = null, airAt = 0;
  async function status() {
    if (net && Date.now() - netAt < 4000) return net;
    let r = await luna('luna://com.palm.connectionmanager/getStatus', {});
    if (!r || r.returnValue === false) r = await luna('luna://com.webos.service.connectionmanager/getStatus', {});
    net = r && r.returnValue !== false ? summarize(r) : { kind: 'unknown', ssid: '', internet: false, ip: '' };
    netAt = Date.now();
    return net;
  }
  async function airplay() {
    if (air && Date.now() - airAt < 60000) return air;
    const r = await luna('luna://com.webos.applicationManager/listApps', {});   // hidden system apps included: AirPlay is one
    air = findAirplay(r && r.apps); airAt = Date.now();
    return air;
  }
  return { status, airplay };
}

module.exports = { create, summarize, findAirplay };
