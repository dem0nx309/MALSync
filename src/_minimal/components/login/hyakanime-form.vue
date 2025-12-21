<template>
  <div class="hyakanime-login-container">
    <div class="header">
      <div v-if="$attrs.onBack" class="back-button" @click="$emit('back')">
        <span class="material-icons">arrow_back</span>
      </div>
      <div class="title">Hyakanime Login</div>
    </div>
    
    <div class="form-content">
      <FormText v-model="email" placeholder="Email" simplePlaceholder class="full-width" />
      <FormText v-model="password" placeholder="Password" inputType="password" simplePlaceholder class="full-width" />
      
      <div v-if="authError" class="error-text">{{ authError }}</div>
      
      <FormButton @click="login" :color="authError ? 'primary' : 'primary'" class="full-width">
        Se connecter
      </FormButton>
    </div>

    <div class="disclaimer">
      <span class="material-icons icon">security</span>
      Note de confidentialité : Vos identifiants sont envoyés directement à Hyakanime. Nous stockons <b>uniquement</b> le token d'authentification pour synchroniser votre compte.
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, PropType } from 'vue';
import FormText from '../form/form-text.vue';
import FormButton from '../form/form-button.vue';

const props = defineProps({
  listObj: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['back', 'success']);

const email = ref(sessionStorage.getItem('hyakanime_draft_email') || '');
const password = ref(sessionStorage.getItem('hyakanime_draft_password') || '');
const authError = ref('');

watch(email, (val) => sessionStorage.setItem('hyakanime_draft_email', val));
watch(password, (val) => sessionStorage.setItem('hyakanime_draft_password', val));

async function login() {
  authError.value = '';
  try {
    if (props.listObj.name === 'Hyakanime' && 'login' in props.listObj) {
        await (props.listObj as any).login(email.value, password.value);
        sessionStorage.removeItem('hyakanime_draft_email');
        sessionStorage.removeItem('hyakanime_draft_password');
        emit('success');
    } else {
        throw new Error('Invalid Provider');
    }
  } catch (e) {
    authError.value = (e as Error).message || 'Login Failed';
  }
}
</script>

<style lang="less" scoped>
@import '../../less/_globals.less';

.hyakanime-login-container {
  background: var(--cl-foreground);
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  position: relative;
}

.back-button {
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: -10px;
  
  &:hover {
    background-color: var(--cl-backdrop);
  }
  
  .material-icons {
    font-size: 1.2rem;
  }
}

.title {
  font-weight: bold;
  font-size: 1.1em;
  text-align: center;
  width: 100%;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.full-width {
  width: 100%;
}

.error-text {
  color: var(--cl-danger);
  font-size: 12px;
  text-align: center;
}

.disclaimer {
  margin-top: 15px;
  font-size: 0.8em;
  color: var(--cl-light-text);
  text-align: center;
  line-height: 1.4;
  
  .icon {
    font-size: 1.2em;
    vertical-align: middle;
    margin-right: 4px;
  }
}
</style>
