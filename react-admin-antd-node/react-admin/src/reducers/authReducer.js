const initialState = {
    isAuthenticated: false,
    user: null,
    redirectPath:'',
};

const authReducer = (state = initialState, action) => {
    switch (action.type) {
        case 'LOGIN':
            return {
                ...state,
                isAuthenticated: true,
                user: action.payload,
            };
        case 'LOGOUT':
            return {
                ...state,
                isAuthenticated: false,
                user: null,
            };
        case 'SET_REDIRECT_PATH':
            return {
                ...state,
                redirectPath: action.payload,
            };
        default:
            return state;
    }
};

export default authReducer;
