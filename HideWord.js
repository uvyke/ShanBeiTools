// ==UserScript==
// @name         单词学习自动隐藏复习单词
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  单词学习自动隐藏复习单词
// @author       dcLunatic & uvyke
// @match        https://web.shanbay.com/wordsweb/*
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==
(function() {
    'use strict';

    var wordNode = null;
    var wordText = "";
    var defaultShowWord = false;
    var cureentIsShowWord = false;
    var inputNode = null;
    var reviewWordSet = new Set();

    function getPage(ipp, pageNo) {
        console.log("获取复习单词数据", ipp, pageNo);
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                url: "https://apiv3.shanbay.com/wordsapp/user_material_books/bbqqzs/learning/words/today_learning_items?ipp=" + ipp + "&page=" + pageNo + "&type_of=REVIEW",
                method: "GET",
                onload: function(xhr) {
                    var responseObject = JSON.parse(xhr.responseText);
                    var data = JSON.parse(unsafeWindow.bays4.d(responseObject.data));

                    // 遍历数组并将 word 属性添加到字典
                    for (const object of data.objects) {
                        if (object.vocab_with_senses.word) {
                            reviewWordSet.add(object.vocab_with_senses.word);
                        }
                    }
                    const totalPages = Math.ceil(data.total / ipp);
                    if (pageNo < totalPages) {
                        // 继续请求下一页
                        resolve(getPage(ipp, pageNo + 1));
                    } else {
                        // 所有数据已获取完成
                        resolve();
                    }
                },
                onerror: function(error) {
                    reject(error);
                }
            });
        });
    }

    function registerReviewWordHideProcess() {

        function isBookStudyPage(){
            return window.location.hash === '#/study?type=book';
        }

        // 创建一个 MutationObserver 实例，监视特定元素及其后代节点的变化
        const observer = new MutationObserver(function(mutationsList, observer) {
            if (!isBookStudyPage()) return;
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    // 检查新添加的子节点是否包含需要处理的节点
                    const addedNodes = mutation.addedNodes;
                    for (let i = 0; i < addedNodes.length; i++) {
                        const node = addedNodes[i];
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // 检查节点类名是否匹配
                            //console.log("处理节点", node);
                            if (node.classList.contains('index_word__3nhJU')) {
                                // 在这里添加替换中文文本为空白的代码
                                console.log('Find word node');
                                switchWordShow(node);
                            }
                            else if (node.classList.contains('index_input__1SBLh')) {
                                console.log('Find word input node');
                                inputNode = node;
                            }
                            else {
                                // 递归处理子节点
                                processChildNodes(node);
                            }
                        }
                    }
                }
            }
        });

        // 递归处理子节点
        function processChildNodes(parentNode) {
            const childNodes = parentNode.childNodes;
            for (let i = 0; i < childNodes.length; i++) {
                const childNode = childNodes[i];
                if (childNode.nodeType === Node.ELEMENT_NODE) {
                    //console.log("递归处理节点", childNode.classList.contains('index_content__1XOlo'), childNode);
                    // 检查节点类名是否匹配
                    if (childNode.classList.contains('index_word__3nhJU')) {
                        // 在这里添加替换中文文本为空白的代码
                        console.log('Find word node');
                        switchWordShow(childNode);
                    }
                    else if (childNode.classList.contains('index_input__1SBLh')) {
                        console.log('Find word input node');
                        inputNode = childNode;
                    }
                    else{
                        // 递归处理子节点
                        processChildNodes(childNode);
                    }
                }
            }
        }

        // 需要监视的目标节点
        const targetNode = document.body; // 监视整个文档的变化，你可以根据需要更改目标节点

        // 配置观察选项，包括监视后代节点的变化
        const config = { childList: true, subtree: true };

        // 启动观察器
        observer.observe(targetNode, config);
    }

    function addSwtichDefaultShowWordSettingLabel(){
        let navNode = document.querySelector('.SubNav_itemsWrapper__1mM4u');

        const spanElement = document.createElement('span');
        spanElement.textContent = "切换默认显示复习单词与否";
        spanElement.addEventListener("click", function() {
            defaultShowWord = defaultShowWord ? false : true;
            // swithStateText();
            alert("默认显示复习单词：" + (defaultShowWord ? "是" : "否"));
            switchWordShow(null, true);
        });
        spanElement.classList.add('SubNav_item__167K_');

        // const stateElement = document.createElement('span');
        // function swithStateText(){
        //     let text = "默认显示复习单词：" + (defaultShowWord ? "是" : "否")
        //     stateElement.textContent = text;
        // }
        // stateElement.classList.add('SubNav_item__167K_');
        // swithStateText();

        navNode.insertAdjacentElement('beforeend', spanElement);
        // navNode.insertAdjacentElement('beforeend', stateElement);
    }

    // 切换单词的显示与否
    function switchWordShow(node = null, changeByDefaultLabel = false){

        // trigegr by initialize
        if (node !== null){
            const spanElement = node.querySelector('span');
            cureentIsShowWord = false;
            wordNode = spanElement;
            wordText = spanElement.textContent;

            if (defaultShowWord == false && reviewWordSet.has(spanElement.textContent)) {
                spanElement.textContent = spanElement.textContent.replace(/\w/g, '*');
            }

            return;
        }

        function showWord(){
            wordNode.textContent = wordText;
            cureentIsShowWord = true;
        }

        function hideWord(){
            wordNode.textContent = wordText.replace(/\w/g, '*');
            cureentIsShowWord = false;
        }

        // trigger by switch default label
        if (changeByDefaultLabel){
            if (defaultShowWord){
                showWord();
            }
            else{
                hideWord();
            }

            return;
        }

        // trigger by key down event
        if (cureentIsShowWord){
            hideWord();
        }
        else {
            showWord();
        }
    }

    function addKeyDownEventMonitor(){

        // 空格键被按下事件
        var spaceKeyDownEvent = new KeyboardEvent('keydown', {
            key: ' ', // 空格键的键名
            keyCode: 32, // 空格键的键码
            bubbles: true, // 是否冒泡
            cancelable: true // 是否可取消
        });

        // d 键被按下事件
        var dKeyDownEvent = new KeyboardEvent('keydown', {
            key: 'd',
            keyCode: 68, // 小写字母"D"的键码
            bubbles: true,
            cancelable: true
        });

        // 添加键盘事件的监听器
        document.addEventListener('keydown', function(event) {

            let eventNode = event.target;

            // 当用户在 input 标签内输入时触发
            if (eventNode.tagName === 'INPUT') {
                if (event.key === 'Enter') {
                    // 当用户按下 Enter 键时执行的代码
                    eventNode.dispatchEvent(spaceKeyDownEvent);
                }
            }

            // 当用户不是在 input 标签内输入时触发
            else {
                if (event.key === 'h') {
                    // 当用户按下 h 键时执行的代码
                    switchWordShow()
                    console.log('Switch show word');
                }
                if (event.key === 'Enter') {
                    // 当用户按下 Enter 键时执行的代码
                    document.dispatchEvent(dKeyDownEvent);
                }
            }
        });

    }

    function main(){
        // 添加切换默认显示与否标签
        addSwtichDefaultShowWordSettingLabel();

        addKeyDownEventMonitor();

        // 更新已复习了的单词数据
        getPage(10, 1)
            .then(() => {
            console.log("所有复习单词已获取完毕");
            registerReviewWordHideProcess();
        })
            .catch((error) => {
            console.error("发生错误", error);
        });
    };

    main()

})();