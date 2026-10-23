<template>
    <header class="flex h-12 shrink-0 items-center border-b bg-background px-4">
        <router-link
            to="/"
            class="flex items-center gap-2 text-foreground"
            aria-label="Audiobook Studio, library"
        >
            <Icon
                name="audio-press"
                class="size-8"
            />
            <span class="text-sm font-medium tracking-tight hidden md:block">Audiobook Studio</span>
        </router-link>
        <div class="mx-2 h-6 w-px bg-white/30 rounded" />

        <a
            href="https://anthonybudd.io"
            target="_blank"
            rel="noopener"
            class=" text-xs text-muted-foreground hover:text-foreground transition-colors"
            style="text-decoration: none;"
        >
            <span class="hidden md:inline">Free to Use - </span>Built by Anthony Budd
        </a>

        <div class="ml-auto">
            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <button
                        type="button"
                        class="flex size-8 items-center justify-center rounded-sm text-foreground hover:bg-accent"
                        aria-label="Menu"
                    >
                        <Menu class="size-4" />
                    </button>
                </DropdownMenuTrigger>
                <MainMenuDropDown />
            </DropdownMenu>
        </div>
    </header>
</template>

<script setup lang="ts">
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import MainMenuDropDown from '@/components/MainMenuDropDown.vue';
import { Menu } from 'lucide-vue-next';
import Icon from '@/assets/Icon.svg';
</script>
