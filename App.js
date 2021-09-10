import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Button,
  StatusBar,
  Dimensions,
  PermissionsAndroid,
} from 'react-native';
import {TextInput, IconButton} from 'react-native-paper';
import Clipboard from '@react-native-community/clipboard';
import {io} from 'socket.io-client';
// import RecordScreen from 'react-native-record-screen';
import {
  RTCPeerConnection,
  RTCView,
  RTCIceCandidate,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
  RTCSessionDescription,
} from 'react-native-webrtc';
const {height, width} = Dimensions.get('screen');

const App = () => {
  const socket = useRef(io('https://video-call-0606.herokuapp.com/')).current;
  const peerConnect = useRef(
    new RTCPeerConnection({
      iceServers: [{urls: 'stun:stun.l.google.com:19302'}],
    }),
  ).current;
  const [myName, setMyName] = useState('');
  const [myId, setMyId] = useState('');
  const [idToCall, setIdToCall] = useState('');
  const [myStream, setMyStream] = useState(null);
  const [partnerStream, setPartnerStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnd, setCallEnd] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [caller, setCaller] = useState();
  const [callerSignal, setCallerSignal] = useState();
  const [isFront, setIsFront] = useState(true);
  const inputId = useRef();

  useEffect(() => {
    socket.on('me', id => {
      // console.log('object');
      setMyId(id);
    });

    //khi có người gọi đến
    socket.on('callUser', data => {
      console.log(`callUser`, data);
      setReceivingCall(true);
      setCaller(data.caller);
      setCallerSignal(data.signal);
    });
    socket.on('cancel', () => {
      setReceivingCall(false);
      setIsCalling(false);
    });
    socket.on('callAccepted', async data => {
      console.log(`callAccepted`, data);
      setCallAccepted(true);
      await peerConnect.setRemoteDescription(new RTCSessionDescription(data));
    });
    peerConnect.onicecandidate = e => {
      // send the candidates to the remote peer
      // see addCandidate below to be triggered on the remote peer
      if (e.candidate) {
        console.log(`send candidate`, e.candidate);
        socket.emit('candidate', {
          candidate: e.candidate,
        });
      }
    };
    socket.on('candidate', data => {
      console.log(`candidate`, data.candidate);
      handleCandidate(data.candidate);
    });

    // registerPeerEvents();

    peerConnect.onaddstream = e => {
      console.log('On Add partner Stream: ', e.stream);
      // this.remoteVideoref.current.srcObject = e.streams[0]
      setPartnerStream(e.stream);
    };
    // peerConnect.oniceconnectionstatechange = e => {
    //   console.log('oniceconnectionstatechange', e);
    // };
    getStream();
  }, []);

  // useEffect(() => {
  //   console.log(`peerConnect.connectionState`, peerConnect.connectionState);
  //   if (peerConnect.connectionState === 'connecting') {
  //     registerPeerEvents();
  //   }
  // }, [peerConnect.connectionState]);

  // const registerPeerEvents = () => {
  //   peerConnect.onaddstream = event => {
  //     console.log('On Add partner Stream: ', event);
  //     setPartnerStream(event.stream);
  //   };

  //   // Setup ice handling
  //   peerConnect.onicecandidate = event => {
  //     if (event.candidate) {
  //       socket.emit('candidate', {
  //         userToCall: idToCall,
  //         candidate: event.candidate,
  //       });
  //     }
  //   };
  // };

  const getStream = async () => {
    try {
      const sourceInfos = await mediaDevices.enumerateDevices();
      let videoSourceId;
      for (let i = 0; i < sourceInfos.length; i++) {
        const sourceInfo = sourceInfos[i];
        if (
          sourceInfo.kind == 'videoinput' &&
          sourceInfo.facing == (isFront ? 'front' : 'environment')
        ) {
          videoSourceId = sourceInfo.deviceId;
        }
      }
      // const stream = await mediaDevices.getUserMedia({
      //   audio: true,
      //   video: {
      //     width: 640,
      //     height: 480,
      //     frameRate: 30,
      //     facingMode: isFront ? 'user' : 'environment',
      //     deviceId: videoSourceId,
      //   },
      // });
      const stream2 = await mediaDevices.getDisplayMedia({
        audio: true,
        video: {
          width: width,
          height: height,
          frameRate: 30,
          // facingMode: isFront ? 'user' : 'environment',
          deviceId: videoSourceId,
        },
      });
      console.log(`stream2`, stream2);
      setMyStream(stream2);
      peerConnect.addStream(stream2);

      // RTC của react native chưa có addTracks nên vẫn phải dùng addStream
      // stream.getTracks().forEach(function(track) {
      //   peerConnect.addTrack(track, stream);
      // });
    } catch (error) {
      console.log(`error 60 App.js: `, error.message);
    }
  };
  //quay video màn hình
  const recordScreen = async () => {
    // recording start
    // RecordScreen.startRecording().catch(error => console.error(error));
    // recording stop
    // const res = await RecordScreen.stopRecording().catch(error =>
    //   console.warn(error),
    // );
    // if (res) {
    //   const url = res.result.outputURL;
    // }
    try {
    } catch (error) {
      console.log(`record screen error: `, error);
    }
  };
  const makeCall = async () => {
    try {
      setIsCalling(true);
      const desc = await createOffer();
      socket.emit('callUser', {
        userToCall: idToCall,
        signalData: desc,
        caller: {from: myId, name: myName},
      });
    } catch (error) {
      console.log(`makeCall error:`, error.message);
    }
  };
  const answer = async () => {
    try {
      await peerConnect.setRemoteDescription(
        new RTCSessionDescription(callerSignal),
      );
      const desc = await peerConnect.createAnswer();
      console.log(`desc answer: `, desc);
      await peerConnect.setLocalDescription(desc);
      setReceivingCall(false);
      setCallAccepted(true);

      socket.emit('acceptCall', {
        to: caller.from,
        signalData: desc,
      });
    } catch (error) {
      console.log('answer error:', error);
    }
  };
  //từ chối cuộc gọi
  const rejectCall = () => {
    setReceivingCall(false);
    socket.emit('cancel', {
      userToCall: caller.from,
    });
  };
  //huỷ cuộc gọi
  const cancel = () => {
    setIsCalling(false);
    socket.emit('cancel', {
      userToCall: idToCall,
    });
  };
  const createOffer = async () => {
    try {
      const desc = await peerConnect.createOffer();
      // console.log(`desc`, desc);
      await peerConnect.setLocalDescription(desc);
      // Send peerConnect.localDescription to peer
      return desc;
    } catch (error) {
      console.log(`createOffer error:`, error);
    }
  };
  const handleCandidate = async candidate => {
    try {
      // setReceivingCall(false);
      peerConnect.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.log(`handleIceCandidate error: `, error);
    }
  };
  //rời khỏi cuộc gọi
  const leaveCall = () => {
    // peerConnect.close();
    // peerConnect.removeStream();
    // setCallAccepted(false);
    // setCallEnd(false);
    // setReceivingCall(false);
    // setIsCalling(false);
    // setIsFront(true);
    // setMyStream(null);
    // setPartnerStream(null);
    // setMyName('');
    // setIdToCall('');
  };
  console.log(partnerStream?._tracks);
  console.log(myStream?._tracks);
  if (receivingCall) {
    return (
      <SafeAreaView style={{flex: 1}}>
        <Text>
          <Text>{caller?.name} is calling...</Text>
          <View style={{flexDirection: 'row'}}>
            <IconButton
              icon="phone"
              size={50}
              color="#009900"
              onPress={answer}
            />
            <IconButton
              icon="phone"
              size={50}
              color="#ff3300"
              onPress={rejectCall}
            />
          </View>
        </Text>
        <IconButton />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={{flex: 1}}>
      {/* <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"> */}
      {/* <View style={{width: width, height: height - StatusBar.currentHeight}}> */}
      <View style={styles.videoContainer}>
        {isCalling || callAccepted ? (
          <View style={{flex: 1}}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text>My ID: {myId}</Text>
              <Button
                title="copy"
                onPress={() => {
                  Clipboard.setString(myId);
                }}
              />
            </View>
            <View style={{flex: 1}}>
              <View style={styles.partnerVideo}>
                {!!partnerStream && (
                  <RTCView
                    streamURL={partnerStream.toURL()}
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'gray',
                    }}
                  />
                )}
              </View>
              <View
                style={{
                  width: '30%',
                  height: '30%',
                  position: 'absolute',
                  right: 0,
                  top: 0,
                }}>
                {!!myStream && (
                  <RTCView streamURL={myStream.toURL()} style={{flex: 1}} />
                )}
              </View>
            </View>

            {!callAccepted && (
              <IconButton
                style={{alignSelf: 'center'}}
                icon="phone"
                size={50}
                color="#ff3300"
                onPress={cancel}
              />
            )}
          </View>
        ) : (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text>My ID: {myId}</Text>
              <Button
                title="copy"
                onPress={() => {
                  Clipboard.setString(myId);
                }}
              />
            </View>
            <TextInput
              label="name"
              value={myName}
              onChangeText={setMyName}
              onSubmitEditing={() => {
                inputId.current.focus();
              }}
            />
            <TextInput
              ref={inputId}
              label="id to call"
              value={idToCall}
              onChangeText={setIdToCall}
            />
            <IconButton
              style={{alignSelf: 'center'}}
              icon="phone"
              size={50}
              color="#009900"
              onPress={() => {
                makeCall();
              }}
            />
          </>
        )}
      </View>
      <View style={styles.handleCall}>
        {callAccepted && !callEnd && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-around',
            }}>
            <IconButton
              icon="phone"
              size={50}
              color="#ff3300"
              onPress={leaveCall}
            />
            <IconButton icon="camera" size={30} onPress={() => {}} />
          </View>
        )}
      </View>
      {/* </View> */}
      {/* </KeyboardAwareScrollView> */}
    </SafeAreaView>
  );
};

export default App;
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  videoContainer: {
    flex: 1,
  },
  partnerVideo: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: 'green',
    // backgroundColor: 'gray',
  },
  myVideo: {},
  handleCall: {},
  partner: {},
});
