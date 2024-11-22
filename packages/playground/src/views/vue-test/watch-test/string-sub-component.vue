<template>
  <div>
    <a-form>
      <a-form-item label="subvalue">
        <a-input v-model:value="subvalue_" />
      </a-form-item>
    </a-form>
  </div>
</template>

<script lang="ts" setup>
const emit = defineEmits<{
  'update:subvalue': [subvalue: string];
}>();

const props = defineProps({
  subvalue: {
    type: String,
    default: '',
  },
});
const { subvalue } = toRefs(props);

const subvalue_ = computed({
  get: () => {
    console.log('');
    console.log('vue-test-sub-component >>> computed get >>> subvalue.value =', subvalue.value);
    return subvalue.value;
  },
  set: newSubvalue => {
    console.log('');
    console.log('vue-test-sub-component >>> computed set >>> newSubvalue =', newSubvalue);
    emit('update:subvalue', newSubvalue);
  },
});
</script>
