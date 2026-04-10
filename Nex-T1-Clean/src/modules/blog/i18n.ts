import type { TranslationValues } from "@/i18n/translate";

type BlogTranslate = (key: string, values?: TranslationValues) => string;

export function getBlogFilterCopy(t: BlogTranslate) {
  return {
    layoutTitleLead: t("layoutTitleLead"),
    layoutTitleHighlight: t("layoutTitleHighlight"),
    explorePricing: t("explorePricing"),
    categoriesLabel: t("categoriesLabel"),
    allCategories: t("allCategories"),
    rssFeed: t("rssFeed"),
  };
}

export function getBlogCommandCopy(t: BlogTranslate) {
  return {
    openAria: t("commandOpenAria"),
    triggerLabel: t("commandTriggerLabel"),
    inputPlaceholder: t("commandInputPlaceholder"),
    empty: t("commandEmpty"),
    categoriesHeading: t("commandCategoriesHeading"),
    postsHeading: t("commandPostsHeading"),
  };
}

export function buildBlogCategoryMetadata(t: BlogTranslate, category: string) {
  return {
    title: t("categoryMetaTitle", { category }),
    description: t("categoryMetaDescription", { category }),
  };
}

export function getBlogMetadataCopy(t: BlogTranslate) {
  return {
    socialAlt: t("meta.socialAlt"),
    postSocialAlt: (title: string) => t("meta.postSocialAlt", { title }),
  };
}

export function getBlogReadArticleAria(t: BlogTranslate, title: string) {
  return t("readArticleAria", { title });
}
