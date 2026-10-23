import { toast } from 'vue-sonner';

export default function errorHandler(error: any, cb: Function | null) {
    console.error(error);

    let code = 0;
    let data = {};
    const style = {
        background: 'red',
        color: 'white',
        border: '0 solid red'
    };

    if (error.response) {
        code = error.response.status;
        data = error.response.data.errors || {};
        if (code === 422) {
            // Do nothing
        } else if (code === 404) {
            // Do nothing
        } else if (code === 401) {
            toast.error(error.response.data.msg || error.response.data.message, { style });
        } else if (code === 500) {
            toast.error('Server error, please try again later');
        } else {
            toast.error(error.response.data.msg || error.response.data.message, { style });
        }
    } else {
        toast.error('Error, please try again', { style });
    }

    if (typeof cb === 'function') cb(data, code, error);
};
