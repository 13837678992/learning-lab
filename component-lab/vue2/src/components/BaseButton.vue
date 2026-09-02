<template>
  <button
    class="base-button"
    :class="[`base-button--${variant}`]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    {{ label }}
  </button>
</template>

<script>
export default {
  name: 'BaseButton',
  props: {
    label: {
      type: String,
      default: '按钮',
    },
    variant: {
      type: String,
      default: 'default',
      validator: v => ['default', 'primary', 'danger'].includes(v),
    },
    disabled: Boolean,
  },
}
</script>

<style scoped>
.base-button {
  padding: 0.5rem 1.2rem;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
  color: #333;
}

.base-button:hover:not(:disabled) {
  border-color: #42b883;
  color: #42b883;
}

.base-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.base-button--primary {
  background: #42b883;
  border-color: #42b883;
  color: #fff;
}

.base-button--primary:hover:not(:disabled) {
  background: #33a06f;
  border-color: #33a06f;
  color: #fff;
}

.base-button--danger {
  background: #e74c3c;
  border-color: #e74c3c;
  color: #fff;
}

.base-button--danger:hover:not(:disabled) {
  background: #c0392b;
  border-color: #c0392b;
  color: #fff;
}
</style>
