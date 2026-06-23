import { createRouter, createWebHistory } from 'vue-router';

import CreateCampaignView from '../views/CreateCampaignView.vue';
import MapView from '../views/MapView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'create-campaign', component: CreateCampaignView },
    { path: '/:token', name: 'map', component: MapView }
  ]
});
