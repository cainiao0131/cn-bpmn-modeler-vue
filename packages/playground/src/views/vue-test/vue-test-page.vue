<template>
  <div>
    <div :style="{ marginBottom: '10px' }">
      <a-radio-group v-model:value="currentTest" button-style="solid">
        <a-radio-button value="1">Watch String</a-radio-button>
        <a-radio-button value="2">Watch Object</a-radio-button>
        <a-radio-button value="3">Computed String</a-radio-button>
        <a-radio-button value="all">All</a-radio-button>
      </a-radio-group>
    </div>
    <a-collapse v-model:activeKey="activeKey">
      <a-collapse-panel v-if="currentTest == '1' || currentTest == 'all'" key="1" header="watch-string">
        <div>
          <a-form>
            <a-form-item label="watchStringValue">
              <a-input v-model:value="watchStringValue" />
            </a-form-item>
          </a-form>
        </div>
        <div>
          <string-component v-model:value="watchStringValue" />
        </div>
      </a-collapse-panel>
      <a-collapse-panel v-if="currentTest == '2' || currentTest == 'all'" key="2" header="watch-object">
        <div>
          <a-form>
            <a-form-item label="watchObjectValue name">
              <a-input :value="watchObjectValue.name" @update:value="onUpdateWtchObjectName" />
            </a-form-item>
          </a-form>
        </div>
        <div>
          <object-component v-model:value="watchObjectValue" />
        </div>
      </a-collapse-panel>
      <a-collapse-panel v-if="currentTest == '3' || currentTest == 'all'" key="3" header="computed-string">
        <div>computed-string</div>
      </a-collapse-panel>
    </a-collapse>
  </div>
</template>

<script lang="ts" setup>
import StringComponent from './watch-test/string-component.vue';
import ObjectComponent from './watch-test/object-component.vue';

const currentTest = ref('1');

const watchStringValue = ref<string>('');
const watchObjectValue = ref<Record<string, string>>({});

const onUpdateWtchObjectName = (name: string) => {
  watchObjectValue.value = { name };
};

const activeKey = ref(['1', '2', '3']);
</script>
