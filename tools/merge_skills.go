package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type rawSkill struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Icon        string   `json:"icon"`
	ImgAlt      string   `json:"img_alt"`
	Tags        []string `json:"tags"`
	Description string   `json:"description"`
}

type Skill struct {
	ID            string   `json:"id"`
	NameSC        string   `json:"name_sc"`
	NameTC        string   `json:"name_tc"`
	NameEN        string   `json:"name_en"`
	Type          string   `json:"type"`
	DescriptionSC string   `json:"description_sc"`
	DescriptionTC string   `json:"description_tc"`
	DescriptionEN string   `json:"description_en"`
	Tags          []string `json:"tags"`
	Icon          string   `json:"icon"`
}

func loadJSON(path string) ([]rawSkill, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var skills []rawSkill
	if err := json.Unmarshal(data, &skills); err != nil {
		return nil, err
	}
	for i := range skills {
		skills[i].Icon = strings.ReplaceAll(skills[i].Icon, "`", "")
		skills[i].Icon = strings.TrimSpace(skills[i].Icon)
	}
	return skills, nil
}

func main() {
	dir := "data"

	enFile := filepath.Join(dir, "skills_en.json")
	scFile := filepath.Join(dir, "skills_sc.json")
	tcFile := filepath.Join(dir, "skills_tc.json")

	enData, err := loadJSON(enFile)
	if err != nil {
		fmt.Printf("警告: 无法加载 %s: %v\n", enFile, err)
		enData = []rawSkill{}
	}
	scData, err := loadJSON(scFile)
	if err != nil {
		fmt.Printf("警告: 无法加载 %s: %v\n", scFile, err)
		scData = []rawSkill{}
	}
	tcData, err := loadJSON(tcFile)
	if err != nil {
		fmt.Printf("警告: 无法加载 %s: %v\n", tcFile, err)
		tcData = []rawSkill{}
	}

	fmt.Printf("已加载: 英文 %d 条, 简体 %d 条, 繁体 %d 条\n", len(enData), len(scData), len(tcData))

	enMap := make(map[string]rawSkill)
	for _, s := range enData {
		enMap[s.ID] = s
	}
	scMap := make(map[string]rawSkill)
	for _, s := range scData {
		scMap[s.ID] = s
	}
	tcMap := make(map[string]rawSkill)
	for _, s := range tcData {
		tcMap[s.ID] = s
	}

	idSet := make(map[string]bool)
	for id := range enMap {
		idSet[id] = true
	}
	for id := range scMap {
		idSet[id] = true
	}
	for id := range tcMap {
		idSet[id] = true
	}

	var merged []Skill
	missing := 0

	for id := range idSet {
		en := enMap[id]
		sc := scMap[id]
		tc := tcMap[id]

		if en.ID == "" && sc.ID == "" && tc.ID == "" {
			missing++
			continue
		}

		var nameSC, nameTC, nameEN, descSC, descTC, descEN, icon string
		var tags []string

		if sc.ID != "" {
			nameSC = sc.Name
			descSC = sc.Description
			tags = sc.Tags
			icon = sc.Icon
		}
		if tc.ID != "" {
			nameTC = tc.Name
			descTC = tc.Description
			if len(tags) == 0 {
				tags = tc.Tags
				icon = tc.Icon
			}
		}
		if en.ID != "" {
			nameEN = en.Name
			descEN = en.Description
			if en.Name != "" && nameSC == "" {
				nameSC = en.Name
				descSC = en.Description
			}
			if en.Name != "" && nameTC == "" {
				nameTC = en.Name
				descTC = en.Description
			}
			if icon == "" {
				icon = en.Icon
			}
		}

		skill := Skill{
			ID:            id,
			NameSC:        nameSC,
			NameTC:        nameTC,
			NameEN:        nameEN,
			Type:          inferType(tags),
			DescriptionSC: descSC,
			DescriptionTC: descTC,
			DescriptionEN: descEN,
			Tags:          tags,
			Icon:          icon,
		}
		merged = append(merged, skill)
	}

	if merged == nil {
		merged = []Skill{}
	}

	outPath := filepath.Join(dir, "skills.json")
	outData, err := json.MarshalIndent(merged, "", "  ")
	if err != nil {
		fmt.Printf("错误: 序列化失败: %v\n", err)
		os.Exit(1)
	}

	if err := os.WriteFile(outPath, outData, 0644); err != nil {
		fmt.Printf("错误: 写入失败: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("✅ 合并完成！共 %d 条技能，已保存到 %s\n", len(merged), outPath)
	if missing > 0 {
		fmt.Printf("⚠️  跳过 %d 条空记录\n", missing)
	}
}

func inferType(tags []string) string {
	tagStr := strings.Join(tags, ",")
	if contains(tags, "光环") || contains(tags, "Aura") {
		return "光环"
	}
	if contains(tags, "召唤") || contains(tags, "Minion") {
		return "召唤"
	}
	if contains(tags, "触发") || contains(tags, "Trigger") {
		return "触发"
	}
	if contains(tags, "位移") || contains(tags, "Movement") {
		return "位移"
	}
	if strings.Contains(tagStr, "辅助") || strings.Contains(tagStr, "Support") {
		return "辅助技能"
	}
	return "主动技能"
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
