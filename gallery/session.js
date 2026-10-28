(function (root, factory) { const api = factory(); if (typeof module === 'object' && module.exports) module.exports = api; else root.GallerySession = api; })(globalThis, function () {
  'use strict';
  class Session {
    constructor({ settings, onShow, onHide, onCycle, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout }) {
      Object.assign(this, { settings, onShow, onHide, onCycle, now });
      this.setTimer = (fn, ms) => setTimer(fn, ms);
      this.clearTimer = id => clearTimer(id);
      this.cycle = 0; this.lastStart = -Infinity; this.visible = false; this.pointer = false; this.focus = false; this.busy = false; this.locked = false; this.revision = 0; this.dismissed = -1;
    }
    get interacting() { return this.pointer || this.focus; }
    cancelTimer() { if (this.timer !== undefined) this.clearTimer(this.timer); this.timer = undefined; }
    arm() { this.cancelTimer(); if (this.visible && !this.interacting && !this.busy && this.settings.autoHideEnabled) this.timer = this.setTimer(() => this.close(false), this.settings.autoHideDelay * 1000); }
    setBusy(value) { this.busy = value; this.arm(); }
    async begin() {
      if (!this.settings.enabled || this.now() - this.lastStart < 850) return false;
      this.lastStart = this.now(); this.cycle++;
      if (this.interacting || this.locked || this.busy) { if (!this.visible) await this.open(); return false; }
      const rev = ++this.revision; this.cancelTimer();
      try { await this.onCycle(); } catch (error) { if (rev !== this.revision) return false; throw error; }
      if (rev !== this.revision || !this.settings.enabled || this.dismissed === this.cycle) return false;
      this.visible = true;
      try { await this.onShow(); } catch (error) { if (rev !== this.revision) return false; throw error; }
      if (rev === this.revision && this.visible) this.arm(); return true;
    }
    async open() {
      if (!this.settings.enabled) return;
      const rev = ++this.revision; this.visible = true;
      try { await this.onShow(); } catch (error) { if (rev !== this.revision) return; throw error; }
      if (rev === this.revision && this.visible) this.arm();
    }
    close(manual = true) { this.revision++; this.cancelTimer(); if (manual) this.dismissed = this.cycle; this.visible = false; this.focus = false; this.pointer = false; this.busy = false; this.onHide(); }
    interact(kind, active) { this[kind] = active; if (this.interacting) this.cancelTimer(); else this.arm(); }
    configure(settings) { this.settings = settings; if (!settings.enabled) this.close(); else this.arm(); }
    destroy() { this.close(); }
  }
  return { Session };
});
