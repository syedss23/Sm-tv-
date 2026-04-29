  function toast(msg) {
    try {
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#122231;color:#9fe6ff;padding:10px 14px;border-radius:9px;border:1px solid #2d4b6a;font-weight:700;font-size:14px;z-index:9999;';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2600);
    } catch (e) {}
  }
