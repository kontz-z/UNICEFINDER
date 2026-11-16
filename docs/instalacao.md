

## Interfaces

- `/`: seleciona a interface conforme o dispositivo detectado.
- `/desktop`: interface desktop.
- `/mobile`: interface mobile.

## PWA e acesso offline

A interface mobile pode ser instalada em dispositivos e navegadores compatíveis.

O Service Worker armazena recursos estáticos em cache para permitir a abertura da interface sem conexão. Autenticação, consultas, cadastros e operações que dependem da API precisam de conexão com o servidor.

