function getQueryVariable(variable) {
    let query = window.location.search.substring(1);
    let queryParams = query.split('&');
    for (const queryParam of queryParams) {
        let keyValue = queryParam.split('=');
        if (decodeURIComponent(keyValue[0]) == variable) {
            return decodeURIComponent(keyValue[1].replace(/\+/g, ' '));
        }
    }

    return undefined;
}
