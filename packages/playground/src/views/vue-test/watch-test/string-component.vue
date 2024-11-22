<template>
  <div>
    <div>
      <string-sub-component v-model:subvalue="subvalue" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import StringSubComponent from './string-sub-component.vue';

const emit = defineEmits<{
  'update:value': [value: string];
}>();

const props = defineProps({
  value: {
    type: String,
    default: '',
  },
});
const { value } = toRefs(props);

const subvalue = ref<string>('');

watch(
  value,
  newValue => {
    console.log('');
    console.log('vue-test-component >>> watch value >>> newValue =', newValue);
    subvalue.value = newValue;
  },
  { immediate: true, deep: true },
);

watch(
  subvalue,
  newSubvalue => {
    console.log('');
    console.log('vue-test-component >>> watch subvalue >>> newSubvalue =', newSubvalue);
    emit('update:value', newSubvalue);
  },
  { immediate: true, deep: true },
);
</script>
