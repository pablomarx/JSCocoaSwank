class SwankSocket < AsyncSocket 
{
  // blank, but necessary so we can set the handler/parser/etc
  // on the socket object
}

class SwankServer < NSObject 
{
  - (BOOL)onSocketWillConnect:(AsyncSocket *)sock {
    return true;
  }

  - (void)onSocket:(AsyncSocket *)sock didAcceptNewSocket:(AsyncSocket *)newSocket {
    var handler = new Handler(
                              function onResponse(response, handler) {
               var responseText = buildMessage(response);
                              [handler.socket writeString:responseText withTimeout:-1 tag:0];
                              });
     
    newSocket.handler = handler;
    handler.socket = newSocket;

    var parser = new SwankParser(function onMessage (message) {
                                 handler.receive(message);
                                 });
    newSocket.parser = parser;
  }
  
  - (void)onSocket:(AsyncSocket *)sock didConnectToHost:(NSString *)host port:(int)port {
    [sock readDataWithTimeout:-1 tag:0];
  }

  - (void)onSocket:(AsyncSocket *)sock didReadData:(NSData *)data withTag:(long)tag {
    var string = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    sock.parser.execute(string);
    [string release];
    [sock readDataWithTimeout:-1 tag:0];
  }

  - (void)onSocketDidDisconnect:(AsyncSocket *)sock {
    sock.handler.removeAllListeners("response");
  }
}

var listener = [[SwankServer alloc] init];
var socket = [[SwankSocket alloc] init];
[socket setDelegate:listener];
var success = [socket acceptOnPort:31337 error:null];
