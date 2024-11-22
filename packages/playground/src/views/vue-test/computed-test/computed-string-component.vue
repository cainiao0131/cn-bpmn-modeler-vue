<template>
  <div>
    <div>
      <string-sub-component v-model:subvalue="subvalue" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import StringSubComponent from '../sub-component/string-sub-component.vue';

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

const subvalue = computed({
  get: () => {
    console.log('');
    console.log('computed-string-component >>> subvalue computed get >>> value.value =', value.value);
    return value.value;
  },
  set: newSubvalue => {
    console.log('');
    console.log('computed-string-component >>> subvalue computed set >>> newSubvalue =', newSubvalue);
    emit('update:value', newSubvalue);
  },
});
</script>
