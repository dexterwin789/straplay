// Substitui o socket.io original do straplay por um gerador local
// Mantém o MESMO contrato da UI: eventos resultsUpdateAovivo / sinalGerado / resetSinal
(function () {
  var RED   = ['1','3','5','7','9','12','14','16','18','19','21','23','25','27','30','32','34','36'];
  var BLACK = ['2','4','6','8','10','11','13','15','17','20','22','24','26','28','29','31','33','35'];
  var listeners = {};

  window.io = function () {
    return {
      on: function (evt, cb) { (listeners[evt] = listeners[evt] || []).push(cb); },
      emit: function () {},
      connect: function () {},
      disconnect: function () {}
    };
  };

  function fire(evt, data) {
    (listeners[evt] || []).forEach(function (cb) { try { cb(data); } catch (e) { console.error(e); } });
  }

  var numeros = [];
  function bootstrap() {
    for (var i = 0; i < 5; i++) numeros.push(String(Math.floor(Math.random() * 37)));
    fire('resultsUpdateAovivo', numeros.slice());
  }
  function tickNumero() {
    numeros.unshift(String(Math.floor(Math.random() * 37)));
    if (numeros.length > 5) numeros.length = 5;
    fire('resultsUpdateAovivo', numeros.slice());
  }

  function randEl(a) { return a[Math.floor(Math.random() * a.length)]; }
  function pad(n) { return String(n).padStart(2, '0'); }

  function gerarSinal() {
    var ref = numeros[0] || '0';
    var estrategias = [
      { tipo: 'COLUNA',    msg: randEl(['1ª e 2ª','2ª e 3ª','1ª e 3ª']) + ' após o ' + ref },
      { tipo: 'DÚZIA',     msg: randEl(['1ª e 2ª','2ª e 3ª','1ª e 3ª']) + ' após o ' + ref },
      { tipo: 'COR',       msg: 'Apostar no ' + randEl(['VERMELHO','PRETO']) },
      { tipo: 'PAR/ÍMPAR', msg: 'Apostar em ' + randEl(['PAR','ÍMPAR']) },
      { tipo: 'METADE',    msg: randEl(['1 a 18','19 a 36']) }
    ];
    var e = randEl(estrategias);
    var d = new Date(Date.now() + (3 + Math.floor(Math.random() * 3)) * 60000);
    fire('sinalGerado', {
      sinalgerado: '✅ ENTRADA CONFIRMADA - ' + e.tipo,
      tipo: e.tipo,
      msg: e.msg,
      protecao: '🎯 Proteja no ZERO - Válido até ' + pad(d.getHours()) + ':' + pad(d.getMinutes()),
      gales: String(1 + Math.floor(Math.random() * 3))
    });
  }
  function cicloSinal() {
    fire('resetSinal');
    setTimeout(function () {
      gerarSinal();
      setTimeout(cicloSinal, (90 + Math.floor(Math.random() * 120)) * 1000);
    }, (6 + Math.floor(Math.random() * 8)) * 1000);
  }

  document.addEventListener('DOMContentLoaded', function () {
    bootstrap();
    setInterval(tickNumero, 30000);
    cicloSinal();
  });
})();
