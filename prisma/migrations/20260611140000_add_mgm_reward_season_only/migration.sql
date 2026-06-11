-- v0.5: prêmio especial da temporada — reward visível/resgatável só com temporada ativa.
-- Janela da temporada continua nas envs (MGM_BOOST_STARTS_AT/ENDS_AT); sem tabela MgmSeason.
ALTER TABLE "MgmReward" ADD COLUMN "seasonOnly" BOOLEAN NOT NULL DEFAULT false;
