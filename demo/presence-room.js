(function($) {

    'use strict';
        
    $.fn.presenceRoom = function(options) {  

        var defaults = {
            user: {
                id: null,
                name: null,
                room: null,
            },
            socketUrl: "",
            setUser: (user) => {
                // 
            },
            removeUser: (user) => {
                // 
            },
        };

        var options = $.extend(defaults, options);

        $.getScript('https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.3.0/socket.io.js', function() {
            var socket = io.connect(options.socketUrl, { 
                query: {
                    id: options.user.id,
                    name: options.user.name,
                    room: options.user.room,
                }
            });
    
            socket.on('previousConnectedUsers', function(previousUsers){          
                for (let user of previousUsers.users) usuarioConectado(user);
            });
    
            socket.on('userConnected', function(userConnected){                
                usuarioConectado(userConnected);
            });
    
            socket.on('userDisconnected', function(disconnectedUser){
                usuarioDesconectado(disconnectedUser);
            });
            
    
            function usuarioConectado(userConnected){
                if (usuarioPertenceASala(userConnected)) {
                    lidarComUsuarioConectado(userConnected);
                }
            }
    
            function usuarioDesconectado(disconnectedUser){
                if (usuarioPertenceASala(disconnectedUser)) {
                    options.removeUser(disconnectedUser);
                    permaneceConectadoSeForUsuarioAtual(disconnectedUser);
                }
            }
    
            function permaneceConectadoSeForUsuarioAtual(disconnectedUser){
                if (disconnectedUser.id == options.user.id) {
                    socket.emit('userConnected', options.user);
                    options.setUser(options.user);
                }
            }
    
            function usuarioPertenceASala(user){
                if (user.room == options.user.room) {
                    return true;
                }
                return false;
            }
    
            function lidarComUsuarioConectado(userConnected){
                if (userConnected.id == options.user.id) {
                    options.user = userConnected;
                }
                options.removeUser(userConnected);
                options.setUser(userConnected);
            }  
        });
    };

})(jQuery);