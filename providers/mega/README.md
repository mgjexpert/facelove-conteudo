# MEGA experimental

Origem: link de pasta pública em `MEGA_FOLDER_URL` configurado apenas no servidor. A chave vem no URL e nunca é enviada ao browser. A biblioteca `megajs` carrega a árvore e descobre nós de ficheiros. `externalId` é o ID do nó e existe só no manifest privado.

`inspect` devolve tamanho e MIME a partir do nome. `openReadStream` recebe offsets inclusivos, reproduzindo a implementação de Range do PoC local. O gateway gere autenticação, HTTP `200/206/416`, headers e limites de blocos; o adapter não conhece posts, usuários ou convites.

MEGA pode impor quota de transferência, os links podem ser revogados e não há transcodificação automática. Um MOV ou codec incompatível poderá falhar no navegador. A listagem é carregada de novo quando o processo reinicia. Não usar esta experiência como solução de escala sem testes de concorrência e quota.
