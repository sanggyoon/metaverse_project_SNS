function handleLike() {
    // 서버로 AJAX 요청을 보냄
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/like', true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
            // 좋아요 수를 증가시킴
            const currentCount = parseInt(document.getElementById('count').innerText);
            document.getElementById('count').innerText = currentCount + 1;
        }
    };
    xhr.send();
}
