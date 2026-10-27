/* Native Chrome DevTools transport for the isolated extension validation profile. */
import fs from 'node:fs/promises';
export class Chrome {
  static async connect(profile) {
    const [port] = (await fs.readFile(profile + '/DevToolsActivePort', 'utf8')).split('\n');
    const meta = await (await fetch('http://127.0.0.1:' + port + '/json/version')).json();
    const c = new Chrome(); c.socket = new WebSocket(meta.webSocketDebuggerUrl); c.pending = new Map(); c.listeners = []; c.serial = 0;
    await new Promise((r, reject) => { c.socket.onopen = r; c.socket.onerror = reject; });
    c.socket.onmessage = event => {
      const v = JSON.parse(event.data);
      if (v.id) { const p = c.pending.get(v.id); if (p) { c.pending.delete(v.id); clearTimeout(p.timer); v.error ? p.reject(new Error(v.error.message)) : p.resolve(v.result); } }
      else for (const fn of c.listeners) fn(v);
    };
    return c;
  }
  call(method, params = {}, sessionId) {
    const id = ++this.serial;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 25000);
      this.pending.set(id, { resolve, reject, timer }); this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  async attach(targetId) { return (await this.call('Target.attachToTarget', { targetId, flatten: true })).sessionId; }
  async page(url = 'about:blank') { const { targetId } = await this.call('Target.createTarget', { url }); const session = await this.attach(targetId); await this.call('Runtime.enable', {}, session); await this.call('Page.enable', {}, session); return { targetId, session }; }
  async eval(expression, session, contextId) {
    const r = await this.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, ...(contextId ? { contextId } : {}) }, session);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result?.value;
  }
  async screenshot(session, path) { const r = await this.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, session); await fs.writeFile(path, Buffer.from(r.data, 'base64')); }
  close() { this.socket.close(); }
}
