"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

import { type UpdateUserProps } from "@/types";
import { LANGUAGES } from "@/constants";

export const updateUserPreferences = async ({
  username,
  preferredLang,
  uiLanguage,
}: UpdateUserProps) => {
  try {
    if (!LANGUAGES.some((language) => language.value === preferredLang)) {
      return { success: false, error: "Unsupported programming language" };
    }
    if (uiLanguage !== "en" && uiLanguage !== "zh") {
      return { success: false, error: "Unsupported interface language" };
    }

    await prisma.user.update({
      where: { username },
      data: {
        preferredLang,
        uiLanguage,
      },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Update failed:", error);
    return { success: false, error: "Update failed" };
  }
};
