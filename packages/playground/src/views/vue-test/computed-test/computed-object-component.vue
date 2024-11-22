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

const subvalue = computed({
  get: () => {
    console.log('');
    console.log('computed-object-component >>> subvalue computed get >>> value.value =', value.value);
    // 创建新对象也不会造成死循环
    return { ...value.value };
  },
  set: newSubvalue => {
    console.log('');
    console.log('computed-object-component >>> subvalue computed set >>> newSubvalue =', newSubvalue);
    // 创建新对象也不会造成死循环
    emit('update:value', { ...newSubvalue });
  },
});
</script>
