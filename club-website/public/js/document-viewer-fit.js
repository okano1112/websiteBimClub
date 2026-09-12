/* Fit the existing fixed-paper document iframe to its viewer without altering template geometry. */
document.addEventListener('DOMContentLoaded', () => {
  const attached = new WeakSet();
  function attach(frame) {
    if (attached.has(frame)) return;
    attached.add(frame);
    const wrapper = document.createElement('div'); wrapper.className = 'apple-document-frame';
    frame.before(wrapper); wrapper.append(frame);
    function fit() {
      const doc = frame.contentDocument, paper = doc?.querySelector('.doc-page');
      if (!paper) return;
      const paperWidth = Math.ceil(paper.getBoundingClientRect().width);
      if (paperWidth < 1 || wrapper.clientWidth < 1) return;
      wrapper.style.maxWidth = `${paperWidth}px`;
      frame.style.width = `${paperWidth}px`; frame.style.minHeight = '0'; frame.style.height = '1px';
      const paperHeight = doc.documentElement.scrollHeight;
      const scale = Math.min(1, wrapper.clientWidth / paperWidth);
      frame.style.height = `${paperHeight}px`; frame.style.transform = `scale(${scale})`;
      wrapper.style.height = `${Math.ceil(paperHeight * scale)}px`;
    }
    frame.addEventListener('load', () => { fit(); frame.contentDocument?.fonts?.ready.then(fit); });
    new ResizeObserver(fit).observe(wrapper);
    fit();
  }
  const scan = () => document.querySelectorAll('#publicTemplateFrame, #cvContainer iframe').forEach(attach);
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true }); scan();
});
