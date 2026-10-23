<template>
    <div class="flex h-dvh flex-col overflow-hidden bg-background">
        <Nav />
        <main class="flex min-h-0 flex-1 flex-col overflow-hidden">
            <RouterView v-slot="{ Component }">
                <component
                    :is="Component"
                    class="h-full min-h-0"
                />
            </RouterView>
        </main>
    </div>
    <Toaster
        position="bottom-right"
        :theme="theme === 'light' ? 'light' : 'dark'"
    />
</template>

<script setup lang="ts">
import { useColorMode } from '@vueuse/core';
import { RouterView } from 'vue-router';
import { onMounted, watch } from 'vue';
import { Toaster } from 'vue-sonner';
import Nav from './components/Nav.vue';

const theme = useColorMode();

watch(theme, (value) => localStorage.setItem('theme', value));
onMounted(() => {
    theme.value = localStorage.getItem('theme') === 'light' ? 'light' : 'dark';
});
</script>