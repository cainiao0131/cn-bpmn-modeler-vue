<template>
  <a-layout class="layout-page-wrapper">
    <a-layout-sider v-model="collapsed" collapsible>
      <div class="logo" />
      <a-menu :selected-keys="selectedKeys" theme="dark" mode="inline" @click="handleClick">
        <a-menu-item v-for="menu in menus" :key="menu.name">
          <span>{{ menu.meta?.title ?? '' }}</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-content class="layout-content-wrapper"><router-view /></a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { MenuInfo } from 'ant-design-vue/es/menu/src/interface';
import { useRoute, useRouter } from 'vue-router';
import { menus } from '../plugins/router/router-modules';

const route = useRoute();
const router = useRouter();

const selectedKeys = computed(() => {
  return [String(route.name || '')];
});
const collapsed = ref(false);

const handleClick = (data: MenuInfo) => {
  router.push({ name: data.key as string });
};
</script>

<style lang="less" scoped>
.layout-page-wrapper {
  height: calc(100vh);
  .layout-content-wrapper {
    margin: 24px 16px;
    padding: 24px;
    background: #fff;
  }
}
</style>
