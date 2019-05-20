(function() {
    var pusher = new Pusher('bae348577bf70ed5ad81', {
        authEndpoint: '/pusher/auth',
        cluster: 'ap4',
        encrypted: true
    });

    let chat = {
        name: undefined,
        email: undefined,
        endUserName: undefined,
        currentRoom: undefined,
        currentChannel: undefined,
        subscribedChannels: [],
        subscribedUsers: []
    }

    var publicChannel = pusher.subscribe('update');

    const chatBody = $(document)
    const chatRoomsList = $('#rooms')
    const chatReplyMessage = $('#replyMessage')

    const helpers = {
        clearChatMessages: () => {
            $('#chat-msgs').html('')
        },

        displayChatMessage: (message) => {
            if (message.email === chat.email) {
                $('#chat-msgs').prepend(
                    `<tr>
                            <td class="py-4 px-10">
                                <div class="font-bold text-base text-gray-800">${message.sender} @ <span class="font-normal text-xs text-gray-600">${message.createdAt}</span></div>
                                <div class="text-base text-gray-800">${message.text}</div>
                            </td>
                        </tr>`
                )
            }
        },

        loadChatRoom: evt => {
            chat.currentRoom = evt.target.dataset.roomId
            chat.currentChannel = evt.target.dataset.channelId
            chat.endUserName = evt.target.dataset.userName
            if (chat.currentRoom !== undefined) {
                $('.response').show()
                $('#room-title').text('Write a message to ' + evt.target.dataset.userName + '.')
            }

            evt.preventDefault()
            helpers.clearChatMessages()
        },

        replyMessage: evt => {
            evt.preventDefault()

            let createdAt = new Date().toLocaleString()
            let message = $('#replyMessage input').val().trim()
            let event = 'client-' + chat.currentRoom

            chat.subscribedChannels[chat.currentChannel].trigger(event, {
                'sender': chat.name,
                'email': chat.currentRoom,
                'text': message,
                'createdAt': createdAt
            });

            $('#chat-msgs').prepend(
                `<tr>
                    <td class="py-4 px-10">
                        <div class="font-bold tex-gray-800 text-base">
                            ${chat.name} @ <span class="font-normal text-xs text-gray-600">${createdAt}</span>
                        </div>
                        <div class="text-base text-gray-800">${message}</div>
                    </td>
                </tr>`
            )

            $('#replyMessage input').val('')
        },

        LogIntoChatSession: function(evt) {
            const name = $('#name').val().trim()
            const email = $('#email').val().trim().toLowerCase()

            chat.name = name;
            chat.email = email;

            chatBody.find('#loginScreenForm input, #loginScreenForm button').attr('disabled', true)

            let validName = (name !== '' && name.length >= 3)
            let validEmail = (email !== '' && email.length >= 5)

            if (validName && validEmail) {
                axios.post('/new/user', {
                    name,
                    email
                }).then(res => {
                    chatBody.find('#registerScreen').addClass("hidden");
                    chatBody.find('#main').removeClass("hidden");

                    chat.myChannel = pusher.subscribe('private-' + res.data.email)
                    chat.myChannel.bind('client-' + chat.email, data => {
                        helpers.displayChatMessage(data)
                    })
                })
            } else {
                alert('Enter a valid name and email.')
            }

            evt.preventDefault()
        }
    }


    publicChannel.bind('new-user', function(data) {
        if (data.email != chat.email) {
            chat.subscribedChannels.push(pusher.subscribe('private-' + data.email));
            chat.subscribedUsers.push(data);

            $('#rooms').html("");

            chat.subscribedUsers.forEach((user, index) => {
                $('#rooms').append(
                    `<li class="flex pb-4"><i class="material-icons">account_circle</i><a data-room-id="${user.email}" data-user-name="${user.name}" data-channel-id="${index}" class="pl-3 text-gray-800 hover:text-gray-500 no-underline capitalize" href="#">${user.name}</a></li>`
                )
            })
        }
    })

    chatReplyMessage.on('submit', helpers.replyMessage)
    chatRoomsList.on('click', 'li', helpers.loadChatRoom)
    chatBody.find('#loginScreenForm').on('submit', helpers.LogIntoChatSession)
}());
