# VCALL

#### Trước khi xem code thì nên xem qua 2 bài viết này để dễ hiểu hơn về flow:
- khái niệm cơ bản: https://kipalog.com/posts/WebRTC-basic---Phan-1--Tim-hieu-ve-NAT--STUN--TURN-vs-ICE
- flow: https://kipalog.com/posts/WebRTC-basic-phan-2---Cach-thiet-lap-mot-cuoc-goi-thong-qua-WebRTC
- ngoài ra thì nên xem qua doc của react-native-webrtc và RTCConnection trên MDN. Có một lưu ý là trên MDN khuyến cáo k nên sử dụng addStream() để truyền stream vào connection mà thay thế bằng addTrack(), tuy nhiên react-native-webrtc chưa chỉnh sửa nên trong code của mình vẫn dùng.