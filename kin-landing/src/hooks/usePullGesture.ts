import { useEffect } from 'react';

/**
 * Shared pull-down gesture hook for triggering the Kin-TXT bounce animation.
 * Emits 'kinxt-pull' and 'kinxt-release' custom events on window.
 */
export function usePullGesture(enabled: boolean = true) {
    useEffect(() => {
        if (!enabled) return;

        let isDown = false;
        let startY = 0;
        let lastY = 0;
        let isPulling = false;
        let scrolledAtStart = 0;
        let scrollContainer: HTMLElement | null = null;

        const clampY = (v: number) => Math.max(0, Math.min(80, v));

        const isInteractiveTarget = (target: EventTarget | null) => {
            const el = target as HTMLElement | null;
            if (!el) return false;
            return !!el.closest(
                'textarea, input, button, a, [role="button"], [data-no-global-drag]'
            );
        };

        const emitPull = (y: number) => {
            window.dispatchEvent(new CustomEvent('kinxt-pull', { detail: { y } }));
        };

        const emitRelease = (y: number) => {
            window.dispatchEvent(new CustomEvent('kinxt-release', { detail: { y } }));
        };

        const getScrollContainer = (target: EventTarget | null) => {
            let el = target as HTMLElement | null;
            while (el) {
                const style = window.getComputedStyle(el);
                const overflowY = style.overflowY;
                const canScrollY =
                    (overflowY === 'auto' || overflowY === 'scroll') &&
                    el.scrollHeight > el.clientHeight + 1;

                if (canScrollY) return el;
                el = el.parentElement;
            }

            return (document.scrollingElement as HTMLElement | null) ?? null;
        };

        const getScrollTop = () => scrollContainer?.scrollTop ?? Math.round(window.scrollY);

        const onPointerDown = (e: PointerEvent) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (isInteractiveTarget(e.target)) return;
            isDown = true;
            isPulling = false;
            startY = e.clientY;
            lastY = e.clientY;
            scrollContainer = getScrollContainer(e.target);
            scrolledAtStart = Math.round(getScrollTop());
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!isDown) return;
            lastY = e.clientY;
            const deltaY = e.clientY - startY;

            // Allow pull gesture if started at (or very near) the top of the active scroll container
            if (deltaY > 0 && scrolledAtStart <= 5) {
                const y = clampY(deltaY);
                isPulling = true;
                emitPull(y);
            } else if (!isPulling) {
                emitPull(0);
            }
        };

        const onPointerUp = () => {
            if (!isDown) return;
            isDown = false;
            const deltaY = lastY - startY;
            const y = isPulling ? clampY(deltaY) : 0;
            emitRelease(y);
            isPulling = false;
        };

        const onTouchStart = (e: TouchEvent) => {
            if (isInteractiveTarget(e.target)) return;
            if (e.touches.length !== 1) return;
            isDown = true;
            isPulling = false;
            startY = e.touches[0].clientY;
            lastY = startY;
            scrollContainer = getScrollContainer(e.target);
            scrolledAtStart = Math.round(getScrollTop());
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!isDown) return;
            if (e.touches.length !== 1) return;
            lastY = e.touches[0].clientY;
            const deltaY = lastY - startY;

            // Allow pull gesture if started at or near the top of the page (within 5px)
            if (deltaY > 0 && scrolledAtStart <= 5) {
                isPulling = true;
                e.preventDefault();
                emitPull(clampY(deltaY));
            } else if (!isPulling) {
                emitPull(0);
            }
        };

        const onTouchEnd = () => {
            if (!isDown) return;
            isDown = false;
            const deltaY = lastY - startY;
            const y = isPulling ? clampY(deltaY) : 0;
            emitRelease(y);
            isPulling = false;
        };

        window.addEventListener('pointerdown', onPointerDown, { passive: true });
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('pointerup', onPointerUp, { passive: true });
        window.addEventListener('pointercancel', onPointerUp, { passive: true });

        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
        window.addEventListener('touchcancel', onTouchEnd, { passive: true });

        return () => {
            window.removeEventListener('pointerdown', onPointerDown as EventListener);
            window.removeEventListener('pointermove', onPointerMove as EventListener);
            window.removeEventListener('pointerup', onPointerUp as EventListener);
            window.removeEventListener('pointercancel', onPointerUp as EventListener);

            window.removeEventListener('touchstart', onTouchStart as EventListener);
            window.removeEventListener('touchmove', onTouchMove as EventListener);
            window.removeEventListener('touchend', onTouchEnd as EventListener);
            window.removeEventListener('touchcancel', onTouchEnd as EventListener);
        };
    }, [enabled]);
}
