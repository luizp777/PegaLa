try {
  var t = localStorage.getItem('pegala_theme');
  var d = t === 'dark' || ((!t || t === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (d) document.documentElement.classList.add('dark');
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', d ? '#09090b' : '#ffffff');
} catch (e) {}
