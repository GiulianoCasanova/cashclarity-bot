
CREATE DATABASE IF NOT EXISTS finance_bot;

USE finance_bot;

CREATE TABLE IF NOT EXISTS usuarios (
    iduser BIGINT PRIMARY KEY,
    nombre_usuario VARCHAR(255),
    saldo DECIMAL(10, 2) DEFAULT 0,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

create table if not exists MasterGrupoUser (
    idgrupo_usuario int AUTO_INCREMENT ,
    idusuario_part bigint(20) PRIMARY KEY,
    nombre_usuario varchar(60),
    constraint fk_Master foreign KEY(idusuario_part) references usuarios(iduser)
);

create table if not exists MasterGrupoGastos(
    idgrupo_gasto int AUTO_INCREMENT PRIMARY KEY,
    idgrupo_usuario int,
    idchat bigint(20),
    iduser bigint(20),
    nombre_grupo VARCHAR(50),
    fecha_inicio date,
    gasto_cerrado boolean,
    constraint fk_GrupoGastos foreign KEY(idgrupo_usuario) references MasterGrupoUser(idgrupo_usuario),
    constraint fk_GrupoGastos2 foreign KEY(iduser) references usuarios(iduser)
);

CREATE TABLE if not exists GrupoGastoUsuarios (
    id_grupo_gasto INT NOT NULL,
    id_usuario bigint(20) NOT NULL,
    PRIMARY KEY (id_grupo_gasto, id_usuario),
    constraint fk_gastoUser FOREIGN KEY(id_grupo_gasto) REFERENCES MasterGrupoGastos(idgrupo_gasto) ON DELETE CASCADE,
    constraint fk_gastoUser2 FOREIGN KEY(id_usuario) REFERENCES MasterGrupoUser(idusuario_part) ON DELETE CASCADE
);


create table if not exists gastos(
    idchat bigint(20) NOT NULL,
    iduser bigint(20) NOT NULL,
    idgasto INT AUTO_INCREMENT PRIMARY KEY,
    idgrupo_gasto INT,
    monto float NOT NULL,
    fechaGasto date,
    gasto_saldado boolean,
    constraint fk_gastos foreign KEY(idgrupo_gasto) references MasterGrupoGastos(idgrupo_gasto),
    constraint fk_gastos2 foreign KEY(iduser) references usuarios(iduser)
);

CREATE TABLE IF NOT EXISTS categorias (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre_categoria VARCHAR(50) NOT NULL
);

ALTER TABLE gastos
ADD COLUMN id_categoria INT,
ADD CONSTRAINT fk_categoria
FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria);

-- ALTER TABLE MasterGrupoUser DROP PRIMARY KEY;
-- ALTER TABLE MasterGrupoUser ADD PRIMARY KEY (idgrupo_usuario, idusuario_part);

ALTER TABLE gastos DROP FOREIGN KEY fk_gastos;

ALTER TABLE gastos
ADD CONSTRAINT fk_gastos
FOREIGN KEY (idgrupo_gasto) REFERENCES MasterGrupoGastos(idgrupo_gasto) ON DELETE CASCADE;
