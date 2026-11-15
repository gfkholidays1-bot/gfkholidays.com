export const HOME_SECTIONS = {
  flights: 'flights',
  packages: 'packages',
  tickets: 'tickets',
  hotels: 'hotels',
  posters: 'posters',
  destinations: 'destinations',
  gallery: 'gallery',
  social: 'social'
} as const;

export type HomeSectionId = (typeof HOME_SECTIONS)[keyof typeof HOME_SECTIONS];

export const HOME_SECTION_EVENT = 'gfk-home-section-change';

export function isHomeSectionId(value?: string | null): value is HomeSectionId {
  if (!value) return false;
  const clean = value.replace(/^#/, '');
  return Object.values(HOME_SECTIONS).includes(clean as HomeSectionId);
}

/**
 * Smoothly scrolls the viewport to a programmatic section ID on the Home view,
 * automatically accounting for the fixed header height.
 */
export function scrollToHomeSection(sectionId: string, focusFlightInput = false): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const cleanId = sectionId.replace(/^#/, '');
  const targetEl = document.getElementById(cleanId);
  if (!targetEl) return false;

  const headerEl = document.querySelector('header');
  const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 80;
  const targetTop = targetEl.getBoundingClientRect().top + window.scrollY - headerHeight - 8;

  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: 'smooth'
  });

  if (window.location.pathname === '/') {
    const nextHash = `#${cleanId}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, document.title, `/${nextHash}`);
    }
  }

  window.dispatchEvent(
    new CustomEvent(HOME_SECTION_EVENT, { detail: { sectionId: cleanId } })
  );

  if (focusFlightInput || cleanId === HOME_SECTIONS.flights) {
    const searchInput = targetEl.querySelector<HTMLInputElement>('input[type="text"]');
    searchInput?.focus({ preventScroll: true });
  }

  return true;
}
