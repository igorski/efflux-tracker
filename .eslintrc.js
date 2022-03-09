module.exports = {
    root: true,
    env: {
        node: true
    },
    "extends": [
        "plugin:vue/essential",
        "eslint:recommended"
    ],
    rules: {
        "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
        "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
        "no-case-declarations": "off",
        "no-async-promise-executor": "off",
        "vue/multi-word-component-names": "off"
    },
    parserOptions: {
        parser: '@babel/eslint-parser'
    }
};
