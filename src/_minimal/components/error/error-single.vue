<template>
  <ErrorGeneral v-if="error">
    <span v-dompurify-html="error" @click="handleClick"></span>
  </ErrorGeneral>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';
import ErrorGeneral from './error-general.vue';

defineProps({
  error: {
    type: String,
    default: '',
  },
});

const router = useRouter();

function handleClick(event: Event) {
  const target = event.target as HTMLElement;
  const href = target.getAttribute('href');
  if (href && (href.endsWith('login/hyakanime') || href === '#/login/hyakanime')) {
    event.preventDefault();
    router.push({ name: 'HyakanimeLogin' });
  }
}
</script>
