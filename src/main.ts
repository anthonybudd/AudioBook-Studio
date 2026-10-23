import ErrorHandler from '@/lib/ErrorHandler';
import VueCookies from 'vue-cookies';
import Router from '@/lib/Router';
import Store from '@/lib/Store';
import { createApp } from 'vue';
import App from './App.vue';
import dayjs from 'dayjs';

import localizedFormat from 'dayjs/plugin/localizedFormat';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';

import 'vue-sonner/style.css';
import './style.css';

createApp(App)
    .use(Router)
    .use(Store)
    .use(VueCookies, { expires: '7d' })
    .use({
        install: (app: any) => {
            app.provide('errorHandler', ErrorHandler);

            dayjs.extend(localizedFormat);
            dayjs.extend(advancedFormat);
            dayjs.extend(relativeTime);
            dayjs.extend(utc);

            app.config.globalProperties.$formatDate = (timestamp: string, format = 'D/M/YYYY HH:mm') => {
                if (timestamp === undefined || timestamp === null) return '';
                return dayjs(timestamp).format(format);
            };

            app.config.globalProperties.$ago = (timestamp: string) => {
                if (timestamp === undefined || timestamp === null) return '';
                return dayjs().to(dayjs(timestamp));
            };
        },
    })
    .mount('#app');
