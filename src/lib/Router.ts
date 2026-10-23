import { createWebHistory, createRouter } from 'vue-router';


const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '',
            component: () => import('./../views/Library.vue'),
            meta: {
                title: 'Library — Audiobook Studio',
            },
        },
        {
            path: '/project/:projectSlug',
            component: () => import('./../views/Project.vue'),
            meta: {
                title: 'Project — Audiobook Studio',
            },
        },

        // 404 
        {
            path: '/:pathMatch(.*)*',
            component: () => import('./../views/404.vue'),
        },
    ]
});


router.beforeEach((to, _, next) => {
    const title = to.meta.title || 'Audiobook Studio';
    document.title = typeof title === 'string' ? title : 'Audiobook Studio';
    next();
});

export default router;