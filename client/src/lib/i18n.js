import { computed, ref } from 'vue';

const STORAGE_KEY = 'trpg-map-lite-locale';
const fallbackLocale = 'zh';

export const messages = {
  zh: {
    'app.title': 'TRPG 魔法学院地图',
    'locale.current': '中文',
    'locale.toggle': 'English',
    'locale.switchTo': 'Switch to English',
    'create.kicker': '新建战役',
    'create.campaignName': '战役名称',
    'create.mapImage': '地图图片',
    'create.defaultCursorUrl': '地图标记 URL',
    'create.pointerCursorUrl': '鼠标图标 URL',
    'create.uploadCursor': '上传',
    'create.uploadingCursor': '上传中...',
    'create.maxZoom': '最大缩放',
    'create.submit': '创建战役',
    'create.creating': '创建中...',
    'create.openEditMap': '打开编辑地图',
    'create.openViewMap': '打开查看地图',
    'create.mapRequired': '需要上传地图图片',
    'campaign.untitled': '未命名战役',
    'map.loading': '地图加载中...',
    'map.tools': '地图工具',
    'map.select': '选择',
    'map.placeMarker': '放置标记',
    'editor.kicker': 'GM 控制台',
    'editor.campaign': '战役',
    'editor.name': '名称',
    'editor.defaultCursorUrl': '地图标记 URL',
    'editor.pointerCursorUrl': '鼠标图标 URL',
    'editor.uploadCursor': '上传',
    'editor.uploadingCursor': '上传中...',
    'editor.maxZoom': '最大缩放',
    'editor.saveConfig': '保存配置',
    'editor.markers': '标记',
    'editor.delete': '删除',
    'editor.openViewMap': '打开查看地图',
    'editor.exportZip': '导出 ZIP',
    'marker.edit': '编辑标记',
    'marker.new': '新建标记',
    'marker.close': '关闭',
    'marker.title': '标题',
    'marker.description': '描述',
    'marker.chatUrl': '聊天 URL',
    'marker.iconStyle': '图标样式',
    'marker.save': '保存',
    'marker.delete': '删除',
    'marker.cancel': '取消'
  },
  en: {
    'app.title': 'TRPG Magic Academy Map',
    'locale.current': 'English',
    'locale.toggle': '中文',
    'locale.switchTo': '切换到中文',
    'create.kicker': 'New Campaign',
    'create.campaignName': 'Campaign name',
    'create.mapImage': 'Map image',
    'create.defaultCursorUrl': 'Map marker URL',
    'create.pointerCursorUrl': 'Mouse icon URL',
    'create.uploadCursor': 'Upload',
    'create.uploadingCursor': 'Uploading...',
    'create.maxZoom': 'Max zoom',
    'create.submit': 'Create campaign',
    'create.creating': 'Creating...',
    'create.openEditMap': 'Open edit map',
    'create.openViewMap': 'Open view map',
    'create.mapRequired': 'Map image is required',
    'campaign.untitled': 'Untitled Campaign',
    'map.loading': 'Loading map...',
    'map.tools': 'Map tools',
    'map.select': 'Select',
    'map.placeMarker': 'Place marker',
    'editor.kicker': 'GM Console',
    'editor.campaign': 'Campaign',
    'editor.name': 'Name',
    'editor.defaultCursorUrl': 'Map marker URL',
    'editor.pointerCursorUrl': 'Mouse icon URL',
    'editor.uploadCursor': 'Upload',
    'editor.uploadingCursor': 'Uploading...',
    'editor.maxZoom': 'Max zoom',
    'editor.saveConfig': 'Save config',
    'editor.markers': 'Markers',
    'editor.delete': 'Delete',
    'editor.openViewMap': 'Open view map',
    'editor.exportZip': 'Export ZIP',
    'marker.edit': 'Edit marker',
    'marker.new': 'New marker',
    'marker.close': 'Close',
    'marker.title': 'Title',
    'marker.description': 'Description',
    'marker.chatUrl': 'Chat URL',
    'marker.iconStyle': 'Icon style',
    'marker.save': 'Save',
    'marker.delete': 'Delete',
    'marker.cancel': 'Cancel'
  }
};

function readStoredLocale() {
  if (typeof window === 'undefined') return fallbackLocale;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return Object.hasOwn(messages, stored) ? stored : fallbackLocale;
}

export const locale = ref(readStoredLocale());
export const localeLabel = computed(() => t('locale.current'));
export const localeToggleLabel = computed(() => t('locale.toggle'));

export function setLocale(nextLocale) {
  if (!Object.hasOwn(messages, nextLocale)) return;
  locale.value = nextLocale;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
  }
}

export function toggleLocale() {
  setLocale(locale.value === 'zh' ? 'en' : 'zh');
}

export function t(key) {
  return messages[locale.value]?.[key] ?? messages[fallbackLocale][key] ?? key;
}
