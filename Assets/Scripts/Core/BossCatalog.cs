/* ==========================================================================
   BossCatalog.cs — четыре сюжетных босса: цепочка и сборка задания.

   Полный аналог web/js/core/bosses.js: боссы открываются по очереди, требуют
   закрытых контрактов и доступа к ЭКСПЕРТу, а задание собирается тем же
   генератором (шаблон указан у босса) и дополняется его легендой и наградой.

   Данные (имена, тексты, награды, требования) лежат в BossCatalog.Generated.cs
   и обновляются из браузерной версии скриптом tools/web/gen-unity-templates.py.
   ========================================================================== */
using System;

namespace CryptoHack
{
    /// <summary>Готовность следующего босса: кто ждёт вызова и чего не хватает.</summary>
    public class BossStatus
    {
        public BossData Boss;
        public bool Ready;
        public string Reason = "";
        public int Done;        // закрыто контрактов
        public int Need;        // требуется для вызова
    }

    public static class BossCatalog
    {
        public static BossData[] List
        {
            get { return BossCatalogGenerated.All; }
        }

        public static int Count
        {
            get { return BossCatalogGenerated.All.Length; }
        }

        public static BossData ByIndex(int index)
        {
            for (int i = 0; i < List.Length; i++)
            {
                if (List[i].Index == index) return List[i];
            }
            return null;
        }

        public static BossData ById(int id)
        {
            for (int i = 0; i < List.Length; i++)
            {
                if (List[i].Id == id) return List[i];
            }
            return null;
        }

        /// <summary>
        /// Собрать миссию-босс: шаблон задания берётся у генератора (с фиксированным
        /// seed), а легенда, защита и награда — из данных босса.
        /// </summary>
        public static Mission Build(int index, int seed)
        {
            BossData boss = ByIndex(index);
            if (boss == null) return null;
            if (seed == 0) seed = boss.Id * 7919;

            Mission basis = ContractGenerator.Generate(boss.Index, "expert", seed,
                0, boss.CodeLib, boss.TemplateId);

            Mission m = new Mission();
            m.Id = boss.Id;
            m.Generated = true;
            m.Boss = true;
            m.BossIndex = boss.Index;
            m.BossName = boss.Name;
            m.BossGlyph = boss.Glyph;
            m.BossSubtitle = boss.Subtitle;
            m.ContractIndex = 0;
            m.TierKey = "expert";
            m.TierLabel = "БОСС";
            m.TierAccent = "#ff7aa8";
            m.TierIndex = ContractGenerator.Tier("expert").Index;
            m.Codename = boss.Name;
            m.Title = boss.Glyph + " БОСС: " + boss.Name;
            m.TargetName = boss.TargetName;
            m.TargetIp = basis != null ? basis.TargetIp : "10.0.0.1";
            m.Os = boss.Os;
            m.Security = boss.Security;
            m.Difficulty = "БОСС";
            m.Concept = basis != null ? basis.Concept : "";
            m.ConceptDesc = basis != null ? basis.ConceptDesc : "";
            m.Briefing = boss.Briefing;
            m.Task = boss.Task;
            m.StarterCode = boss.StarterCode;
            m.Solution = boss.Solution;
            m.Hints = boss.Hints;
            // требования — свои у босса, иначе базовые из шаблона
            m.RequiredPatterns = boss.RequiredPatterns != null && boss.RequiredPatterns.Length > 0
                ? boss.RequiredPatterns
                : (basis != null ? basis.RequiredPatterns : new string[0]);
            m.RewardCrypto = boss.Coin;
            m.RewardAmount = boss.Amount;
            m.RewardDollars = boss.Dollars;
            m.RewardXp = boss.Xp;
            m.RequiredCodeLib = boss.CodeLib;
            m.RequiredLevel = 5;
            m.Theory = boss.Theory;
            return m;
        }

        /// <summary>Следующий неповерженный босс (по порядку цепочки).</summary>
        public static BossData Next(Game game)
        {
            for (int i = 0; i < List.Length; i++)
            {
                if (!game.IsMissionCompleted(List[i].Id)) return List[i];
            }
            return null;
        }

        public static int DefeatedCount(Game game)
        {
            int count = 0;
            for (int i = 0; i < List.Length; i++)
            {
                if (game.IsMissionCompleted(List[i].Id)) count++;
            }
            return count;
        }

        /// <summary>Готов ли следующий босс: закрыто достаточно контрактов и есть арсенал.</summary>
        public static BossStatus Availability(Game game)
        {
            BossStatus status = new BossStatus();
            BossData boss = Next(game);
            status.Boss = boss;
            if (boss == null)
            {
                status.Ready = false;
                status.Reason = "все боссы повержены";
                return status;
            }

            status.Need = boss.Need;
            status.Done = game.ContractsDone();

            if (!game.TierUnlocked("expert"))
            {
                status.Ready = false;
                status.Reason = "нужен доступ к ЭКСПЕРТу: " + game.TierRequirement("expert");
                return status;
            }
            if (status.Done < boss.Need)
            {
                status.Ready = false;
                status.Reason = "нужно закрыть контрактов: " + boss.Need + " (сейчас " + status.Done + ")";
                return status;
            }

            status.Ready = true;
            status.Reason = "";
            return status;
        }
    }
}
