import { computed, ref } from 'vue';

const STORAGE_KEY = 'trpg-map-lite-locale';
const fallbackLocale = 'zh';

export const messages = {
  zh: {
    'app.title': 'TRPG 瓦片地图创建器',
    'locale.current': '中文',
    'locale.toggle': 'English',
    'locale.switchTo': 'Switch to English',
    'create.kicker': '新建地图',
    'create.campaignName': '地图名称',
    'create.mapImage': '地图图片',
    'create.dropzoneHint': '点击或将地图拖拽至此',
    'create.defaultCursorUrl': '默认鼠标图标',
    'create.pointerCursorUrl': '鼠标图标',
    'create.uploadCursor': '上传',
    'create.uploadingCursor': '上传中...',
    'create.maxZoom': '最大缩放',
    'create.submit': '创建地图',
    'create.creating': '创建中...',
    'create.openEditMap': '打开编辑地图',
    'create.openViewMap': '打开查看地图',
    'create.openEditMode': '进入编辑模式',
    'create.copyShareLink': '复制玩家分享链接',
    'create.copiedShareLink': '已复制玩家分享链接',
    'create.mapRequired': '需要上传地图图片',
    'campaign.untitled': '未命名地图',
    'map.loading': '地图加载中...',
    'map.tools': '地图工具',
    'map.select': '选择',
    'map.placeMarker': '放置标记',
    'editor.kicker': 'GM 控制台',
    'editor.campaign': '地图',
    'editor.basicConfig': '地图基础配置',
    'editor.cursorConfig': '光标设置',
    'editor.markerManagement': '标记管理',
    'editor.noMarkers': '暂无标记',
    'editor.collapseConsole': '折叠控制台',
    'editor.expandConsole': '展开控制台',
    'editor.name': '名称',
    'editor.defaultCursorUrl': '默认鼠标图标',
    'editor.pointerCursorUrl': '鼠标图标',
    'editor.uploadCursor': '上传',
    'editor.uploadMarkerIcon': '上传标记图标',
    'editor.markerIcons': '标记图标',
    'editor.defaultMarkerSettings': '默认地图标记',
    'editor.useAsDefaultMarker': '设为默认地图标记',
    'editor.replaceMarkerIcon': '替换标记图标',
    'editor.uploadingCursor': '上传中...',
    'editor.maxZoom': '最大缩放',
    'editor.saveConfig': '保存配置',
    'editor.markers': '标记',
    'editor.delete': '删除',
    'editor.openViewMap': '打开查看地图',
    'editor.exportZip': '导出 ZIP',
    'editor.importZip': '导入 ZIP',
    'editor.importingZip': '导入中...',
    'editor.importZipConfirm': '导入会覆盖当前工程的地图、切片、标记和图标。当前编辑链接和查看链接会保留。是否继续？',
    'marker.edit': '编辑标记',
    'marker.new': '新建标记',
    'marker.close': '关闭',
    'marker.title': '标题',
    'marker.showTitle': '显示地名',
    'marker.description': '描述',
    'marker.showDescription': '显示简介',
    'marker.chatUrl': '聊天 URL',
    'marker.iconStyle': '图标样式',
    'marker.useStyleIcon': '使用默认样式',
    'marker.styleColor': '颜色',
    'marker.styleSize': '大小',
    'marker.save': '保存',
    'marker.delete': '删除',
    'marker.cancel': '取消',
    'marker.untitled': '未命名标记'
  },
  en: {
    'app.title': 'TRPG Tile Map Creator',
    'locale.current': 'English',
    'locale.toggle': '中文',
    'locale.switchTo': '切换到中文',
    'create.kicker': 'New Map',
    'create.campaignName': 'Map name',
    'create.mapImage': 'Map image',
    'create.dropzoneHint': 'Click or drag your map here',
    'create.defaultCursorUrl': 'Default mouse icon',
    'create.pointerCursorUrl': 'Mouse icon',
    'create.uploadCursor': 'Upload',
    'create.uploadingCursor': 'Uploading...',
    'create.maxZoom': 'Max zoom',
    'create.submit': 'Create map',
    'create.creating': 'Creating...',
    'create.openEditMap': 'Open edit map',
    'create.openViewMap': 'Open view map',
    'create.openEditMode': 'Enter edit mode',
    'create.copyShareLink': 'Copy player share link',
    'create.copiedShareLink': 'Player share link copied',
    'create.mapRequired': 'Map image is required',
    'campaign.untitled': 'Untitled Map',
    'map.loading': 'Loading map...',
    'map.tools': 'Map tools',
    'map.select': 'Select',
    'map.placeMarker': 'Place marker',
    'editor.kicker': 'GM Console',
    'editor.campaign': 'Map',
    'editor.basicConfig': 'Map basics',
    'editor.cursorConfig': 'Cursor settings',
    'editor.markerManagement': 'Marker management',
    'editor.noMarkers': 'No markers yet',
    'editor.collapseConsole': 'Collapse console',
    'editor.expandConsole': 'Expand console',
    'editor.name': 'Name',
    'editor.defaultCursorUrl': 'Default mouse icon',
    'editor.pointerCursorUrl': 'Mouse icon',
    'editor.uploadCursor': 'Upload',
    'editor.uploadMarkerIcon': 'Upload marker icon',
    'editor.markerIcons': 'Marker icons',
    'editor.defaultMarkerSettings': 'Default map marker',
    'editor.useAsDefaultMarker': 'Use as default map marker',
    'editor.replaceMarkerIcon': 'Replace marker icon',
    'editor.uploadingCursor': 'Uploading...',
    'editor.maxZoom': 'Max zoom',
    'editor.saveConfig': 'Save config',
    'editor.markers': 'Markers',
    'editor.delete': 'Delete',
    'editor.openViewMap': 'Open view map',
    'editor.exportZip': 'Export ZIP',
    'editor.importZip': 'Import ZIP',
    'editor.importingZip': 'Importing...',
    'editor.importZipConfirm': 'Importing will overwrite this project map, tiles, markers, and icons. Current edit and view links will be preserved. Continue?',
    'marker.edit': 'Edit marker',
    'marker.new': 'New marker',
    'marker.close': 'Close',
    'marker.title': 'Title',
    'marker.showTitle': 'Show location name',
    'marker.description': 'Description',
    'marker.showDescription': 'Show description',
    'marker.chatUrl': 'Chat URL',
    'marker.iconStyle': 'Icon style',
    'marker.useStyleIcon': 'Use default style',
    'marker.styleColor': 'Color',
    'marker.styleSize': 'Size',
    'marker.save': 'Save',
    'marker.delete': 'Delete',
    'marker.cancel': 'Cancel',
    'marker.untitled': 'Untitled marker'
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
