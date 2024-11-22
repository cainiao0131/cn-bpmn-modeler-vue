<template>
  <div>
    <div>
      <object-sub-component v-model:subvalue="subvalue" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import ObjectSubComponent from '../sub-component/object-sub-component.vue';

const emit = defineEmits<{
  'update:value': [value: Record<string, string>];
}>();

const props = defineProps({
  value: {
    type: Object as PropType<Record<string, string>>,
    default: () => {
      return {};
    },
  },
});
const { value } = toRefs(props);

const subvalue = ref<Record<string, string>>({});

watch(
  value,
  newValue => {
    console.log('');
    console.log('vue-test-component >>> watch value >>> newValue =', newValue);
    // subvalue.value = { ...newValue }; 会造成死循环
    subvalue.value = newValue;
  },
  { immediate: true, deep: true },
);

watch(
  subvalue,
  newSubvalue => {
    console.log('');
    console.log('vue-test-component >>> watch subvalue >>> newSubvalue =', newSubvalue);
    // emit('update:value', { ...newSubvalue }); 会造成死循环
    emit('update:value', newSubvalue);
  },
  { immediate: true, deep: true },
);
</script>
