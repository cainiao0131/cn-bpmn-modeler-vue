<template>
  <a-layout class="layout-page-wrapper">
    <a-layout-sider v-model:collapsed="collapsed" collapsible>
      <div class="logo" />
      <a-menu v-model:selectedKeys="selectedKeys" theme="dark" mode="inline">
        <a-menu-item key="1">
          <branches-outlined />
          <span>流程图</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-content class="layout-content-wrapper"><router-view /></a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { BranchesOutlined } from '@ant-design/icons-vue';

const selectedKeys = ref(['1']);
const collapsed = ref(true);
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
