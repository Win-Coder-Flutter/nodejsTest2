
exports.formatMsg = (message, returnCode, data = null) => {
    return {
        returnValue: {
            message,
            returnCode
        },
        ...(data && { data })
    };
};
