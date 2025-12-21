<template>
  <div class="page-container">
    <HyakanimeForm 
      v-if="listObj"
      :list-obj="listObj" 
      @back="goBack"
      @success="onSuccess" 
    />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import HyakanimeForm from '../components/login/hyakanime-form.vue';
import { getListbyType } from '../../_provider/listFactory';

const router = useRouter();

const listObj = computed(() => {
    // Assuming we want the one from settings, or we could pass a prop.
    // Since this is specific to Hyakanime, we can hardcode looking for 'HYAKANIME'
    // But better to check what the current sync mode is if that's relevant, 
    // OR just instantiate Hyakanime provider directly if possible.
    // However, the form expects a specific object structure.
    // The easiest way is getting it from the factory.
    // Only issue: getListbyType takes 'MAL' | 'ANILIST' etc.
    // Let's force get 'HYAKANIME'.
    const provider = getListbyType('HYAKANIME'); 
    return provider;
});

function goBack() {
  router.back();
}

function onSuccess() {
  router.push({ name: 'Settings', params: { path: ['tracking', 'syncMode'] } });
}
</script>

<style lang="less" scoped>
.page-container {
  display: flex;
  justify-content: center;
  padding-top: 50px;
  height: 100%;
}
</style>
