export const HOME_PAGE_TITLE = 'TRPG瓦片地图 | TRPG Tile Map';

export function buildHomeTitle() {
  return HOME_PAGE_TITLE;
}

export function buildMapTitle(payload, fallbackName = '未命名地图') {
  const name = String(payload?.campaign?.name || '').trim() || fallbackName;
  return payload?.mode === 'edit' ? `${name}|编辑模式` : name;
}

export function setDocumentTitle(title) {
  if (typeof document === 'undefined') return;
  document.title = title;
}
