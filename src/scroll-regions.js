// Framework-independent. Call once per application root and dispose on unmount.
// Select moving content only; tables with sticky headers should use edge shadows instead.
export function createScrollRegions({ root = document, selector = '[data-scroll-region]' } = {}) {
    const win = root.ownerDocument?.defaultView || root.defaultView || window;
    const regions = new Set();
    let frame = 0, stopped = false;
    const measure = element => {
        const style = win.getComputedStyle(element);
        const vertical = /auto|scroll/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
        const horizontal = /auto|scroll/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1;
        const axis = vertical ? 'y' : horizontal ? 'x' : 'y';
        const position = axis === 'y' ? element.scrollTop : element.scrollLeft;
        const remaining = axis === 'y' ? element.scrollHeight - element.clientHeight - position : element.scrollWidth - element.clientWidth - position;
        element.classList.add('fe-scroll-fade');
        element.dataset.scrollAxis = axis;
        element.dataset.scrollStart = String((vertical || horizontal) && position > 1);
        element.dataset.scrollEnd = String((vertical || horizontal) && remaining > 1);
    };
    const clean = element => {
        element.classList.remove('fe-scroll-fade');
        delete element.dataset.scrollAxis; delete element.dataset.scrollStart; delete element.dataset.scrollEnd;
    };
    const resize = new win.ResizeObserver(() => schedule());
    function refresh() {
        frame = 0;
        if (stopped) return;
        const current = new Set(root.querySelectorAll(selector));
        for (const element of regions) if (!current.has(element)) { resize.unobserve(element); regions.delete(element); clean(element); }
        for (const element of current) {
            if (!regions.has(element)) { regions.add(element); resize.observe(element); }
            measure(element);
        }
    }
    function schedule() { if (!frame && !stopped) frame = win.requestAnimationFrame(refresh); }
    const mutations = new win.MutationObserver(() => {
        // Drop detached plaintext panels even when a hidden tab suspends animation frames.
        for (const element of regions) if (!root.contains(element)) {
            resize.unobserve(element); regions.delete(element); clean(element);
        }
        schedule();
    });
    mutations.observe(root, { childList:true, subtree:true, characterData:true });
    // Capturing catches native scroll events without changing wheel/touch behavior.
    const onScroll = event => { if (regions.has(event.target)) measure(event.target); };
    root.addEventListener('scroll', onScroll, { capture:true, passive:true });
    win.addEventListener('resize', schedule);
    root.addEventListener('load', schedule, true);
    refresh();
    return {
        refresh: schedule,
        destroy() {
            stopped = true; win.cancelAnimationFrame(frame); mutations.disconnect(); resize.disconnect();
            root.removeEventListener('scroll', onScroll, true); root.removeEventListener('load', schedule, true); win.removeEventListener('resize', schedule);
            for (const element of regions) clean(element);
            regions.clear();
        }
    };
}
