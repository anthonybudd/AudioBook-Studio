<template>
    <DropdownMenuContent
        align="end"
        class="w-56"
    >
        <DropdownMenuItem @click="openAnthonyBuddio">
            Built By Anthony Budd
        </DropdownMenuItem>
        <DropdownMenuItem @click="router.push('/')">
            Library
        </DropdownMenuItem>
        <DropdownMenuItem @click="theme = theme === 'light' ? 'dark' : 'light'">
            {{ theme === 'dark' ? 'Light Mode' : 'Dark Mode' }}
        </DropdownMenuItem>
    </DropdownMenuContent>
</template>

<script setup lang="ts">
import {
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useColorMode } from '@vueuse/core';
import { useRouter } from 'vue-router';

const router = useRouter();
const theme = useColorMode();

const openAnthonyBuddio = () => window.open('https://anthonybudd.io', '_blank');
</script>
